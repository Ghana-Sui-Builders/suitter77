module suitter::messaging {
    use std::string::{String};
    use sui::clock::{Clock};
    use sui::table::{Self, Table};
    use suitter::suitter::{GlobalRegistry, increment_messages, emit_conversation_created, emit_message_sent};

    const ENotParticipant: u64 = 1;
    const EMessageEmpty: u64 = 3;
    const ECannotMessageSelf: u64 = 4;
    const EInvalidBlobId: u64 = 5;

    // Message structure
    // Encrypted content is stored on Walrus as blob ID
    // Content hash is used for verification
    public struct Message has store {
        sender: address,
        encrypted_content_blob_id: String,  // Walrus blob ID containing encrypted message content
        content_hash: vector<u8>,  // Hash of the original content for verification
        timestamp_ms: u64,
        is_read: bool,
        media_blob_id: Option<String>,  // Optional media attachment (also encrypted)
    }

    // Conversation between two users
    public struct Conversation has key, store {
        id: UID,
        participant1: address,
        participant2: address,
        messages: vector<Message>,
        last_message_timestamp_ms: u64,
    }

    // Registry to track conversations between users
    public struct ConversationRegistry has key {
        id: UID,
        // Maps user1 -> user2 -> conversation_id
        // To find a conversation, check both (user1, user2) and (user2, user1)
        conversations: Table<address, Table<address, ID>>,
    }

    fun init(ctx: &mut TxContext) {
        let conversation_registry = ConversationRegistry {
            id: object::new(ctx),
            conversations: table::new(ctx),
        };
        transfer::share_object(conversation_registry);
    }

    // Helper function to check if conversation exists in either direction
    fun conversation_exists(
        registry: &ConversationRegistry,
        user1: address,
        user2: address
    ): bool {
        // Check (user1, user2)
        if (table::contains(&registry.conversations, user1)) {
            let user2_table = table::borrow(&registry.conversations, user1);
            if (table::contains(user2_table, user2)) {
                return true
            }
        };
        // Check (user2, user1)
        if (table::contains(&registry.conversations, user2)) {
            let user1_table = table::borrow(&registry.conversations, user2);
            if (table::contains(user1_table, user1)) {
                return true
            }
        };
        false
    }

    // Helper function to get conversation ID from either direction
    fun get_conversation_id_helper(
        registry: &ConversationRegistry,
        user1: address,
        user2: address
    ): Option<ID> {
        // Try (user1, user2)
        if (table::contains(&registry.conversations, user1)) {
            let user2_table = table::borrow(&registry.conversations, user1);
            if (table::contains(user2_table, user2)) {
                return option::some(*table::borrow(user2_table, user2))
            }
        };
        // Try (user2, user1)
        if (table::contains(&registry.conversations, user2)) {
            let user1_table = table::borrow(&registry.conversations, user2);
            if (table::contains(user1_table, user1)) {
                return option::some(*table::borrow(user1_table, user1))
            }
        };
        option::none()
    }

    // Create or get existing conversation between two users
    entry fun start_conversation(
        conversation_registry: &mut ConversationRegistry,
        _global_registry: &mut GlobalRegistry,
        other_user: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(sender != other_user, ECannotMessageSelf);

        // Check if conversation already exists
        if (conversation_exists(conversation_registry, sender, other_user)) {
            // Conversation already exists, return early
            return
        };

        // Create new conversation
        // Store participants in a consistent order (sender first, then other_user)
        let conversation = Conversation {
            id: object::new(ctx),
            participant1: sender,
            participant2: other_user,
            messages: vector::empty(),
            last_message_timestamp_ms: clock.timestamp_ms(),
        };

        let conversation_id = object::id(&conversation);

        // Add to registry in both directions for easy lookup
        // (sender, other_user)
        if (!table::contains(&conversation_registry.conversations, sender)) {
            table::add(&mut conversation_registry.conversations, sender, table::new(ctx));
        };
        let other_table = table::borrow_mut(&mut conversation_registry.conversations, sender);
        table::add(other_table, other_user, conversation_id);

        // Also add (other_user, sender) for reverse lookup
        if (!table::contains(&conversation_registry.conversations, other_user)) {
            table::add(&mut conversation_registry.conversations, other_user, table::new(ctx));
        };
        let sender_table = table::borrow_mut(&mut conversation_registry.conversations, other_user);
        table::add(sender_table, sender, conversation_id);

        emit_conversation_created(conversation_id, sender, other_user, clock.timestamp_ms());

        transfer::share_object(conversation);
    }

    // Send an encrypted message in a conversation
    // The encrypted content should be uploaded to Walrus first, then the blob ID is passed here
    entry fun send_message(
        _conversation_registry: &ConversationRegistry,
        global_registry: &mut GlobalRegistry,
        conversation: &mut Conversation,
        encrypted_content_blob_id: String,
        content_hash: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(sender == conversation.participant1 || sender == conversation.participant2, ENotParticipant);

        // Validate blob ID is not empty
        let blob_id_length = encrypted_content_blob_id.length();
        assert!(blob_id_length > 0, EInvalidBlobId);

        // Validate content hash is not empty
        let hash_length = vector::length(&content_hash);
        assert!(hash_length > 0, EMessageEmpty);

        let timestamp_ms = clock.timestamp_ms();
        let message = Message {
            sender,
            encrypted_content_blob_id,
            content_hash,
            timestamp_ms,
            is_read: false,
            media_blob_id: option::none(),
        };

        vector::push_back(&mut conversation.messages, message);
        conversation.last_message_timestamp_ms = timestamp_ms;

        let receiver = if (sender == conversation.participant1) {
            conversation.participant2
        } else {
            conversation.participant1
        };

        increment_messages(global_registry);
        emit_message_sent(object::id(conversation), sender, receiver, timestamp_ms);
    }

    // Send an encrypted message with media attachment
    // Both the message content and media are encrypted and stored on Walrus
    entry fun send_message_with_media(
        _conversation_registry: &ConversationRegistry,
        global_registry: &mut GlobalRegistry,
        conversation: &mut Conversation,
        encrypted_content_blob_id: String,
        content_hash: vector<u8>,
        media_blob_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(sender == conversation.participant1 || sender == conversation.participant2, ENotParticipant);

        // Validate blob IDs are not empty
        let blob_id_length = encrypted_content_blob_id.length();
        assert!(blob_id_length > 0, EInvalidBlobId);
        
        let media_blob_id_length = media_blob_id.length();
        assert!(media_blob_id_length > 0, EInvalidBlobId);

        // Validate content hash is not empty
        let hash_length = vector::length(&content_hash);
        assert!(hash_length > 0, EMessageEmpty);

        let timestamp_ms = clock.timestamp_ms();
        let message = Message {
            sender,
            encrypted_content_blob_id,
            content_hash,
            timestamp_ms,
            is_read: false,
            media_blob_id: option::some(media_blob_id),
        };

        vector::push_back(&mut conversation.messages, message);
        conversation.last_message_timestamp_ms = timestamp_ms;

        let receiver = if (sender == conversation.participant1) {
            conversation.participant2
        } else {
            conversation.participant1
        };

        increment_messages(global_registry);
        emit_message_sent(object::id(conversation), sender, receiver, timestamp_ms);
    }

    // Mark messages as read (helper function for recursion)
    fun mark_messages_as_read_helper(
        messages: &mut vector<Message>,
        reader: address,
        index: u64,
        end_index: u64
    ) {
        if (index >= end_index) {
            return
        };
        let message = vector::borrow_mut(messages, index);
        // Only mark as read if the reader is not the sender
        if (message.sender != reader) {
            message.is_read = true;
        };
        mark_messages_as_read_helper(messages, reader, index + 1, end_index);
    }

    // Mark messages as read
    entry fun mark_messages_as_read(
        conversation: &mut Conversation,
        up_to_index: u64,
        ctx: &TxContext
    ) {
        let reader = ctx.sender();
        assert!(reader == conversation.participant1 || reader == conversation.participant2, ENotParticipant);

        let messages_length = vector::length(&conversation.messages);
        let end_index = if (up_to_index >= messages_length) {
            messages_length
        } else {
            up_to_index + 1
        };

        mark_messages_as_read_helper(&mut conversation.messages, reader, 0, end_index);
    }

    // Get conversation ID for two users
    public fun get_conversation_id(
        conversation_registry: &ConversationRegistry,
        user1: address,
        user2: address
    ): Option<ID> {
        get_conversation_id_helper(conversation_registry, user1, user2)
    }

    // Get all messages in a conversation
    public fun get_messages(conversation: &Conversation): &vector<Message> {
        &conversation.messages
    }

    // Get conversation participants
    public fun get_participants(conversation: &Conversation): (address, address) {
        (conversation.participant1, conversation.participant2)
    }

    // Get last message timestamp
    public fun get_last_message_timestamp(conversation: &Conversation): u64 {
        conversation.last_message_timestamp_ms
    }

    // Check if user is participant
    public fun is_participant(conversation: &Conversation, user: address): bool {
        conversation.participant1 == user || conversation.participant2 == user
    }

    // Message getter functions
    public fun message_sender(message: &Message): address {
        message.sender
    }

    public fun message_encrypted_content_blob_id(message: &Message): String {
        message.encrypted_content_blob_id
    }

    public fun message_content_hash(message: &Message): vector<u8> {
        message.content_hash
    }

    public fun message_timestamp_ms(message: &Message): u64 {
        message.timestamp_ms
    }

    public fun message_is_read(message: &Message): bool {
        message.is_read
    }

    public fun message_media_blob_id(message: &Message): &Option<String> {
        &message.media_blob_id
    }
}


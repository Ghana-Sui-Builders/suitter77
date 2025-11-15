module suitter::interactions {
    use std::string::{String};
    use sui::clock::{Clock};
    use sui::table::{Self, Table};
    use suitter::suit::{Self, Suit};
    use suitter::suitter::{GlobalRegistry, increment_likes, increment_comments, increment_reposts, increment_mentions, emit_like_added, emit_comment_added, emit_repost_added, emit_mention_added};

    const EAlreadyLiked: u64 = 1;
    const ECommentTooLong: u64 = 2;
    const ECommentEmpty: u64 = 3;
    const EAlreadyReposted: u64 = 4;
    const ECannotMentionSelf: u64 = 5;

    const MAX_COMMENT_LENGTH: u64 = 280;

    public struct Like has key, store {
        id: UID,
        suit_id: ID,
        liker: address,
        timestamp_ms: u64,
    }

    public struct Comment has key, store {
        id: UID,
        suit_id: ID,
        author: address,
        content: String,
        timestamp_ms: u64,
        walrus_blob_id: Option<String>,
    }

    public struct Repost has key, store {
        id: UID,
        suit_id: ID,
        reposter: address,
        original_author: address,
        timestamp_ms: u64,
    }

    public struct Mention has key, store {
        id: UID,
        content_id: ID,  // Can be suit_id or comment_id
        content_type: u8,  // 0 = suit, 1 = comment
        mentioned_user: address,
        mentioner: address,
        timestamp_ms: u64,
    }

    public struct LikeRegistry has key {
        id: UID,
        suit_likes: Table<ID, Table<address, bool>>,
    }

    public struct RepostRegistry has key {
        id: UID,
        suit_reposts: Table<ID, Table<address, bool>>,
    }

    public struct MentionRegistry has key {
        id: UID,
        content_mentions: Table<ID, Table<address, bool>>,  // content_id -> mentioned_user -> bool
    }

    fun init(ctx: &mut TxContext) {
        let like_registry = LikeRegistry {
            id: object::new(ctx),
            suit_likes: table::new(ctx),
        };
        transfer::share_object(like_registry);

        let repost_registry = RepostRegistry {
            id: object::new(ctx),
            suit_reposts: table::new(ctx),
        };
        transfer::share_object(repost_registry);

        let mention_registry = MentionRegistry {
            id: object::new(ctx),
            content_mentions: table::new(ctx),
        };
        transfer::share_object(mention_registry);
    }

    entry fun like_suit(
        global_registry: &mut GlobalRegistry,
        like_registry: &mut LikeRegistry,
        suit: &mut Suit,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let suit_id = object::id(suit);
        let liker = ctx.sender();

        if (!table::contains(&like_registry.suit_likes, suit_id)) {
            table::add(&mut like_registry.suit_likes, suit_id, table::new(ctx));
        };

        let likes_table = table::borrow_mut(&mut like_registry.suit_likes, suit_id);
        assert!(!table::contains(likes_table, liker), EAlreadyLiked);

        let like = Like {
            id: object::new(ctx),
            suit_id,
            liker,
            timestamp_ms: clock.timestamp_ms(),
        };

        table::add(likes_table, liker, true);
        suit::increment_likes(suit);
        increment_likes(global_registry);
        emit_like_added(suit_id, liker);

        transfer::share_object(like);
    }

    entry fun comment_on_suit(
        global_registry: &mut GlobalRegistry,
        suit: &mut Suit,
        content: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let content_length = content.length();
        assert!(content_length > 0, ECommentEmpty);
        assert!(content_length <= MAX_COMMENT_LENGTH, ECommentTooLong);

        let suit_id = object::id(suit);
        let comment = Comment {
            id: object::new(ctx),
            suit_id,
            author: ctx.sender(),
            content,
            timestamp_ms: clock.timestamp_ms(),
            walrus_blob_id: option::none(),
        };

        let comment_id = object::id(&comment);
        
        suit::increment_comments(suit);
        increment_comments(global_registry);
        emit_comment_added(suit_id, comment_id, ctx.sender());

        transfer::share_object(comment);
    }

    entry fun comment_on_suit_with_media(
        global_registry: &mut GlobalRegistry,
        suit: &mut Suit,
        content: String,
        walrus_blob_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let content_length = content.length();
        assert!(content_length > 0, ECommentEmpty);
        assert!(content_length <= MAX_COMMENT_LENGTH, ECommentTooLong);

        let suit_id = object::id(suit);
        let comment = Comment {
            id: object::new(ctx),
            suit_id,
            author: ctx.sender(),
            content,
            timestamp_ms: clock.timestamp_ms(),
            walrus_blob_id: option::some(walrus_blob_id),
        };

        let comment_id = object::id(&comment);
        
        suit::increment_comments(suit);
        increment_comments(global_registry);
        emit_comment_added(suit_id, comment_id, ctx.sender());

        transfer::share_object(comment);
    }

    entry fun repost_suit(
        global_registry: &mut GlobalRegistry,
        repost_registry: &mut RepostRegistry,
        suit: &mut Suit,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let suit_id = object::id(suit);
        let reposter = ctx.sender();
        let original_author = suit::author(suit);

        if (!table::contains(&repost_registry.suit_reposts, suit_id)) {
            table::add(&mut repost_registry.suit_reposts, suit_id, table::new(ctx));
        };

        let reposts_table = table::borrow_mut(&mut repost_registry.suit_reposts, suit_id);
        assert!(!table::contains(reposts_table, reposter), EAlreadyReposted);

        let repost = Repost {
            id: object::new(ctx),
            suit_id,
            reposter,
            original_author,
            timestamp_ms: clock.timestamp_ms(),
        };

        let repost_id = object::id(&repost);
        
        table::add(reposts_table, reposter, true);
        suit::increment_reposts(suit);
        increment_reposts(global_registry);
        emit_repost_added(suit_id, repost_id, reposter, original_author);

        transfer::share_object(repost);
    }

    public fun has_liked(
        like_registry: &LikeRegistry,
        suit_id: ID,
        user: address
    ): bool {
        if (!table::contains(&like_registry.suit_likes, suit_id)) {
            return false
        };

        let likes_table = table::borrow(&like_registry.suit_likes, suit_id);
        table::contains(likes_table, user)
    }

    public fun like_suit_id(like: &Like): ID {
        like.suit_id
    }

    public fun liker(like: &Like): address {
        like.liker
    }

    public fun like_timestamp_ms(like: &Like): u64 {
        like.timestamp_ms
    }

    public fun comment_suit_id(comment: &Comment): ID {
        comment.suit_id
    }

    public fun comment_author(comment: &Comment): address {
        comment.author
    }

    public fun comment_content(comment: &Comment): String {
        comment.content
    }

    public fun comment_timestamp_ms(comment: &Comment): u64 {
        comment.timestamp_ms
    }

    public fun comment_walrus_blob_id(comment: &Comment): &Option<String> {
        &comment.walrus_blob_id
    }

    public fun has_reposted(
        repost_registry: &RepostRegistry,
        suit_id: ID,
        user: address
    ): bool {
        if (!table::contains(&repost_registry.suit_reposts, suit_id)) {
            return false
        };

        let reposts_table = table::borrow(&repost_registry.suit_reposts, suit_id);
        table::contains(reposts_table, user)
    }

    public fun repost_suit_id(repost: &Repost): ID {
        repost.suit_id
    }

    public fun reposter(repost: &Repost): address {
        repost.reposter
    }

    public fun repost_original_author(repost: &Repost): address {
        repost.original_author
    }

    public fun repost_timestamp_ms(repost: &Repost): u64 {
        repost.timestamp_ms
    }

    /// Add a mention to a suit
    entry fun mention_user_in_suit(
        global_registry: &mut GlobalRegistry,
        mention_registry: &mut MentionRegistry,
        suit: &Suit,
        mentioned_user: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let suit_id = object::id(suit);
        let mentioner = ctx.sender();

        // Don't allow self-mentions
        assert!(mentioner != mentioned_user, ECannotMentionSelf);

        if (!table::contains(&mention_registry.content_mentions, suit_id)) {
            table::add(&mut mention_registry.content_mentions, suit_id, table::new(ctx));
        };

        let mentions_table = table::borrow_mut(&mut mention_registry.content_mentions, suit_id);
        
        // Allow multiple mentions of the same user in the same content (different mentioners)
        // But track if this specific mentioner already mentioned this user in this content
        let mention_key = mentioned_user;
        
        let mention = Mention {
            id: object::new(ctx),
            content_id: suit_id,
            content_type: 0,  // 0 = suit
            mentioned_user,
            mentioner,
            timestamp_ms: clock.timestamp_ms(),
        };

        let mention_id = object::id(&mention);
        
        // Track that this user was mentioned in this content
        if (!table::contains(mentions_table, mention_key)) {
            table::add(mentions_table, mention_key, true);
        };
        
        increment_mentions(global_registry);
        emit_mention_added(suit_id, mention_id, mentioner, mentioned_user, 0);

        transfer::share_object(mention);
    }

    /// Add a mention to a comment
    entry fun mention_user_in_comment(
        global_registry: &mut GlobalRegistry,
        mention_registry: &mut MentionRegistry,
        comment: &Comment,
        mentioned_user: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let comment_id = object::id(comment);
        let mentioner = ctx.sender();

        // Don't allow self-mentions
        assert!(mentioner != mentioned_user, ECannotMentionSelf);

        if (!table::contains(&mention_registry.content_mentions, comment_id)) {
            table::add(&mut mention_registry.content_mentions, comment_id, table::new(ctx));
        };

        let mentions_table = table::borrow_mut(&mut mention_registry.content_mentions, comment_id);
        let mention_key = mentioned_user;
        
        let mention = Mention {
            id: object::new(ctx),
            content_id: comment_id,
            content_type: 1,  // 1 = comment
            mentioned_user,
            mentioner,
            timestamp_ms: clock.timestamp_ms(),
        };

        let mention_id = object::id(&mention);
        
        // Track that this user was mentioned in this content
        if (!table::contains(mentions_table, mention_key)) {
            table::add(mentions_table, mention_key, true);
        };
        
        increment_mentions(global_registry);
        emit_mention_added(comment_id, mention_id, mentioner, mentioned_user, 1);

        transfer::share_object(mention);
    }

    /// Check if a user was mentioned in a suit or comment
    public fun has_mentioned(
        mention_registry: &MentionRegistry,
        content_id: ID,
        mentioned_user: address
    ): bool {
        if (!table::contains(&mention_registry.content_mentions, content_id)) {
            return false
        };

        let mentions_table = table::borrow(&mention_registry.content_mentions, content_id);
        table::contains(mentions_table, mentioned_user)
    }

    /// Get mention details
    public fun mention_content_id(mention: &Mention): ID {
        mention.content_id
    }

    public fun mention_content_type(mention: &Mention): u8 {
        mention.content_type
    }

    public fun mention_mentioned_user(mention: &Mention): address {
        mention.mentioned_user
    }

    public fun mention_mentioner(mention: &Mention): address {
        mention.mentioner
    }

    public fun mention_timestamp_ms(mention: &Mention): u64 {
        mention.timestamp_ms
    }
}
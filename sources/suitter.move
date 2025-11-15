module suitter::suitter {
    use std::string::{String};
    use sui::event;
    use sui::table::{Self, Table};

    public struct AdminCap has key, store {
        id: UID,
    }

    public struct SuitInfo has copy, drop, store {
        suit_id: ID,
        author: address,
        timestamp_ms: u64,
        has_media: bool,
    }

    public struct GlobalRegistry has key {
        id: UID,
        total_suits: u64,
        total_profiles: u64,
        total_likes: u64,
        total_comments: u64,
        total_reposts: u64,
        total_mentions: u64,
        total_messages: u64,
        total_communities: u64,

        posts: Table<ID, SuitInfo>,

        author_suits: Table<address, Table<ID, bool>>,
    }

    public struct SuitCreated has copy, drop {
        suit_id: ID,
        author: address,
        timestamp: u64,
    }

    public struct ProfileCreated has copy, drop {
        profile_id: ID,
        owner: address,
        username: String,
    }

    public struct LikeAdded has copy, drop {
        suit_id: ID,
        liker: address,
    }

    public struct CommentAdded has copy, drop {
        suit_id: ID,
        comment_id: ID,
        author: address,
    }

    public struct RepostAdded has copy, drop {
        suit_id: ID,
        repost_id: ID,
        reposter: address,
        original_author: address,
    }

    public struct UserFollowed has copy, drop {
        follower: address,
        followee: address,
    }

    public struct UserUnfollowed has copy, drop {
        unfollower: address,
        unfollowee: address,
    }

    public struct MentionAdded has copy, drop {
        content_id: ID,
        mention_id: ID,
        mentioner: address,
        mentioned_user: address,
        content_type: u8,  
    }

    public struct ConversationCreated has copy, drop {
        conversation_id: ID,
        participant1: address,
        participant2: address,
        timestamp_ms: u64,
    }

    public struct MessageSent has copy, drop {
        conversation_id: ID,
        sender: address,
        receiver: address,
        timestamp_ms: u64,
    }

    public struct CommunityCreated has copy, drop {
        community_id: ID,
        creator: address,
        name: String,
        handle: String,
        timestamp_ms: u64,
    }

    public struct CommunityPostCreated has copy, drop {
        community_id: ID,
        suit_id: ID,
        author: address,
        timestamp_ms: u64,
    }

    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };

        let registry = GlobalRegistry {
            id: object::new(ctx),
            total_suits: 0,
            total_profiles: 0,
            total_likes: 0,
            total_comments: 0,
            total_reposts: 0,
            total_mentions: 0,
            total_messages: 0,
            total_communities: 0,
            posts: table::new(ctx),
            author_suits: table::new(ctx),
        };

        transfer::transfer(admin_cap, ctx.sender());
        transfer::share_object(registry);
    }

    public fun increment_suits(registry: &mut GlobalRegistry) {
        registry.total_suits = registry.total_suits + 1;
    }

    public fun increment_profiles(registry: &mut GlobalRegistry) {
        registry.total_profiles = registry.total_profiles + 1;
    }

    public fun increment_likes(registry: &mut GlobalRegistry) {
        registry.total_likes = registry.total_likes + 1;
    }

    public fun increment_comments(registry: &mut GlobalRegistry) {
        registry.total_comments = registry.total_comments + 1;
    }

    public fun increment_reposts(registry: &mut GlobalRegistry) {
        registry.total_reposts = registry.total_reposts + 1;
    }

    public fun increment_mentions(registry: &mut GlobalRegistry) {
        registry.total_mentions = registry.total_mentions + 1;
    }

    public fun increment_messages(registry: &mut GlobalRegistry) {
        registry.total_messages = registry.total_messages + 1;
    }

    public fun increment_communities(registry: &mut GlobalRegistry) {
        registry.total_communities = registry.total_communities + 1;
    }

    public fun register_suit(
        registry: &mut GlobalRegistry,
        suit_id: ID,
        author: address,
        timestamp_ms: u64,
        has_media: bool,
        ctx: &mut TxContext
    ) {
        let suit_info = SuitInfo {
            suit_id,
            author,
            timestamp_ms,
            has_media,
        };

        table::add(&mut registry.posts, suit_id, suit_info);

        if (!table::contains(&registry.author_suits, author)) {
            table::add(&mut registry.author_suits, author, table::new(ctx));
        };
        let author_suits_table = table::borrow_mut(&mut registry.author_suits, author);
        table::add(author_suits_table, suit_id, true);
    }

    public fun suit_exists(registry: &GlobalRegistry, suit_id: ID): bool {
        table::contains(&registry.posts, suit_id)
    }

    public fun get_suit_info(registry: &GlobalRegistry, suit_id: ID): Option<SuitInfo> {
        if (table::contains(&registry.posts, suit_id)) {
            option::some(*table::borrow(&registry.posts, suit_id))
        } else {
            option::none()
        }
    }

    public fun get_suit_author(registry: &GlobalRegistry, suit_id: ID): Option<address> {
        if (table::contains(&registry.posts, suit_id)) {
            let info = table::borrow(&registry.posts, suit_id);
            option::some(info.author)
        } else {
            option::none()
        }
    }

    public fun get_suit_timestamp(registry: &GlobalRegistry, suit_id: ID): Option<u64> {
        if (table::contains(&registry.posts, suit_id)) {
            let info = table::borrow(&registry.posts, suit_id);
            option::some(info.timestamp_ms)
        } else {
            option::none()
        }
    }

    public fun suit_has_media(registry: &GlobalRegistry, suit_id: ID): bool {
        if (table::contains(&registry.posts, suit_id)) {
            let info = table::borrow(&registry.posts, suit_id);
            info.has_media
        } else {
            false
        }
    }

    public fun author_has_suit(registry: &GlobalRegistry, author: address, suit_id: ID): bool {
        if (!table::contains(&registry.author_suits, author)) {
            return false
        };
        let author_suits_table = table::borrow(&registry.author_suits, author);
        table::contains(author_suits_table, suit_id)
    }

    public fun suit_info_id(info: &SuitInfo): ID {
        info.suit_id
    }

    public fun suit_info_author(info: &SuitInfo): address {
        info.author
    }

    public fun suit_info_timestamp(info: &SuitInfo): u64 {
        info.timestamp_ms
    }

    public fun suit_info_has_media(info: &SuitInfo): bool {
        info.has_media
    }

    public fun emit_suit_created(suit_id: ID, author: address, timestamp: u64) {
        event::emit(SuitCreated { suit_id, author, timestamp });
    }

    public fun emit_profile_created(profile_id: ID, owner: address, username: String) {
        event::emit(ProfileCreated { profile_id, owner, username });
    }

    public fun emit_like_added(suit_id: ID, liker: address) {
        event::emit(LikeAdded { suit_id, liker });
    }

    public fun emit_comment_added(suit_id: ID, comment_id: ID, author: address) {
        event::emit(CommentAdded { suit_id, comment_id, author });
    }

    public fun emit_repost_added(suit_id: ID, repost_id: ID, reposter: address, original_author: address) {
        event::emit(RepostAdded { suit_id, repost_id, reposter, original_author });
    }

    public fun emit_user_followed(follower: address, followee: address) {
        event::emit(UserFollowed { follower, followee });
    }

    public fun emit_user_unfollowed(unfollower: address, unfollowee: address) {
        event::emit(UserUnfollowed { unfollower, unfollowee });
    }

    public fun emit_mention_added(content_id: ID, mention_id: ID, mentioner: address, mentioned_user: address, content_type: u8) {
        event::emit(MentionAdded { content_id, mention_id, mentioner, mentioned_user, content_type });
    }

    public fun emit_conversation_created(conversation_id: ID, participant1: address, participant2: address, timestamp_ms: u64) {
        event::emit(ConversationCreated { conversation_id, participant1, participant2, timestamp_ms });
    }

    public fun emit_message_sent(conversation_id: ID, sender: address, receiver: address, timestamp_ms: u64) {
        event::emit(MessageSent { conversation_id, sender, receiver, timestamp_ms });
    }

    public fun emit_community_created(community_id: ID, creator: address, name: String, handle: String, timestamp_ms: u64) {
        event::emit(CommunityCreated { community_id, creator, name, handle, timestamp_ms });
    }

    public fun emit_community_post_created(community_id: ID, suit_id: ID, author: address, timestamp_ms: u64) {
        event::emit(CommunityPostCreated { community_id, suit_id, author, timestamp_ms });
    }
}
module suitter::suitter {
    use std::string::{String};
    use sui::event;

    public struct AdminCap has key, store {
        id: UID,
    }

    public struct GlobalRegistry has key {
        id: UID,
        total_suits: u64,
        total_profiles: u64,
        total_likes: u64,
        total_comments: u64,
        total_reposts: u64,
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
}
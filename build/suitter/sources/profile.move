module suitter::profile {
    use std::string::{String};
    use sui::clock::{Clock};
    use sui::table::{Self, Table};
    use suitter::suitter::{GlobalRegistry, increment_profiles, emit_profile_created, emit_user_followed, emit_user_unfollowed};

    const EUsernameExists: u64 = 1;
    const EUsernameTooShort: u64 = 2;
    const EUsernameTooLong: u64 = 3;
    const EProfileNotFound: u64 = 4;
    const ENotProfileOwner: u64 = 5;
    const EAlreadyFollowing: u64 = 6;
    const ENotFollowing: u64 = 7;
    const ECannotFollowSelf: u64 = 8;

    const MIN_USERNAME_LENGTH: u64 = 3;
    const MAX_USERNAME_LENGTH: u64 = 20;

    public struct Profile has key, store {
        id: UID,
        owner: address,
        username: String,
        bio: String,
        profile_image_blob_id: Option<String>,
        suits_count: u64,
        followers_count: u64,
        following_count: u64,
        created_at_ms: u64,
    }

    public struct ProfileRegistry has key {
        id: UID,
        username_to_profile: Table<String, address>,
        address_to_username: Table<address, String>,
    }

    public struct FollowRegistry has key {
        id: UID,
        user_following: Table<address, Table<address, bool>>,
    }

    fun init(ctx: &mut TxContext) {
        let profile_registry = ProfileRegistry {
            id: object::new(ctx),
            username_to_profile: table::new(ctx),
            address_to_username: table::new(ctx),
        };
        transfer::share_object(profile_registry);

        let follow_registry = FollowRegistry {
            id: object::new(ctx),
            user_following: table::new(ctx),
        };
        transfer::share_object(follow_registry);
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }

    entry fun create_profile(
        global_registry: &mut GlobalRegistry,
        profile_registry: &mut ProfileRegistry,
        username: String,
        bio: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let username_length = username.length();
        assert!(username_length >= MIN_USERNAME_LENGTH, EUsernameTooShort);
        assert!(username_length <= MAX_USERNAME_LENGTH, EUsernameTooLong);

        let sender = ctx.sender();
        assert!(!table::contains(&profile_registry.username_to_profile, username), EUsernameExists);
        assert!(!table::contains(&profile_registry.address_to_username, sender), EUsernameExists);

        let profile = Profile {
            id: object::new(ctx),
            owner: sender,
            username,
            bio,
            profile_image_blob_id: option::none(),
            suits_count: 0,
            followers_count: 0,
            following_count: 0,
            created_at_ms: clock.timestamp_ms(),
        };

        let profile_id = object::id(&profile);
        
        table::add(&mut profile_registry.username_to_profile, username, sender);
        table::add(&mut profile_registry.address_to_username, sender, username);

        increment_profiles(global_registry);
        emit_profile_created(profile_id, sender, username);

        transfer::transfer(profile, sender);
    }

    entry fun update_bio(
        profile: &mut Profile,
        new_bio: String,
        ctx: &TxContext
    ) {
        assert!(profile.owner == ctx.sender(), ENotProfileOwner);
        profile.bio = new_bio;
    }

    entry fun update_profile_image(
        profile: &mut Profile,
        walrus_blob_id: String,
        ctx: &TxContext
    ) {
        assert!(profile.owner == ctx.sender(), ENotProfileOwner);
        profile.profile_image_blob_id = option::some(walrus_blob_id);
    }

    public(package) fun increment_suits_count(profile: &mut Profile) {
        profile.suits_count = profile.suits_count + 1;
    }

    public fun get_profile_by_username(
        registry: &ProfileRegistry,
        username: String
    ): Option<address> {
        if (table::contains(&registry.username_to_profile, username)) {
            option::some(*table::borrow(&registry.username_to_profile, username))
        } else {
            option::none()
        }
    }

    public fun get_username_by_address(
        registry: &ProfileRegistry,
        addr: address
    ): Option<String> {
        if (table::contains(&registry.address_to_username, addr)) {
            option::some(*table::borrow(&registry.address_to_username, addr))
        } else {
            option::none()
        }
    }

    public fun owner(profile: &Profile): address {
        profile.owner
    }

    public fun username(profile: &Profile): String {
        profile.username
    }

    public fun bio(profile: &Profile): String {
        profile.bio
    }

    public fun profile_image_blob_id(profile: &Profile): &Option<String> {
        &profile.profile_image_blob_id
    }

    public fun suits_count(profile: &Profile): u64 {
        profile.suits_count
    }

    public fun created_at_ms(profile: &Profile): u64 {
        profile.created_at_ms
    }

    public fun followers_count(profile: &Profile): u64 {
        profile.followers_count
    }

    public fun following_count(profile: &Profile): u64 {
        profile.following_count
    }

    entry fun follow_user(
        follow_registry: &mut FollowRegistry,
        follower_profile: &mut Profile,
        followee_profile: &mut Profile,
        ctx: &mut TxContext
    ) {
        let follower = ctx.sender();
        let followee = followee_profile.owner;

        assert!(follower == follower_profile.owner, ENotProfileOwner);
        assert!(follower != followee, ECannotFollowSelf);
        assert!(followee == followee_profile.owner, ENotProfileOwner); // Ensure followee_profile belongs to followee

        if (!table::contains(&follow_registry.user_following, follower)) {
            table::add(&mut follow_registry.user_following, follower, table::new(ctx));
        };

        let following_table = table::borrow_mut(&mut follow_registry.user_following, follower);
        assert!(!table::contains(following_table, followee), EAlreadyFollowing);

        table::add(following_table, followee, true);
        follower_profile.following_count = follower_profile.following_count + 1;
        followee_profile.followers_count = followee_profile.followers_count + 1;

        emit_user_followed(follower, followee);
    }

    entry fun unfollow_user(
        follow_registry: &mut FollowRegistry,
        unfollower_profile: &mut Profile,
        unfollowee_profile: &mut Profile,
        ctx: &TxContext
    ) {
        let unfollower = ctx.sender();
        let unfollowee = unfollowee_profile.owner;

        assert!(unfollower == unfollower_profile.owner, ENotProfileOwner);

        assert!(table::contains(&follow_registry.user_following, unfollower), ENotFollowing);
        let following_table = table::borrow_mut(&mut follow_registry.user_following, unfollower);
        assert!(table::contains(following_table, unfollowee), ENotFollowing);

        table::remove(following_table, unfollowee);
        unfollower_profile.following_count = unfollower_profile.following_count - 1;
        unfollowee_profile.followers_count = unfollowee_profile.followers_count - 1;

        emit_user_unfollowed(unfollower, unfollowee);
    }

    public fun is_following(
        follow_registry: &FollowRegistry,
        follower: address,
        followee: address
    ): bool {
        if (!table::contains(&follow_registry.user_following, follower)) {
            return false
        };

        let following_table = table::borrow(&follow_registry.user_following, follower);
        table::contains(following_table, followee)
    }
}
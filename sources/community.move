module suitter::community {
    use std::string::{String};
    use sui::clock::{Clock};
    use sui::table::{Self, Table};
    use suitter::suitter::{GlobalRegistry, increment_communities, emit_community_created, emit_community_post_created};
    use suitter::suit::{create_and_share_suit_for_community, create_and_share_suit_with_media_for_community};

    const ENameTooShort: u64 = 1;
    const ENameTooLong: u64 = 2;
    const EHandleTooShort: u64 = 3;
    const EHandleTooLong: u64 = 4;
    const EDescriptionTooLong: u64 = 5;
    const EHandleExists: u64 = 6;
    const EAlreadyMember: u64 = 8;
    const ENotMember: u64 = 9;

    const MIN_NAME_LENGTH: u64 = 3;
    const MAX_NAME_LENGTH: u64 = 40;
    const MIN_HANDLE_LENGTH: u64 = 3;
    const MAX_HANDLE_LENGTH: u64 = 40;
    const MAX_DESCRIPTION_LENGTH: u64 = 280;

    public struct Community has key, store {
        id: UID,
        name: String,
        handle: String,
        description: String,
        creator: address,
        privacy: u8, 
        members_count: u64,
        thumbnail_blob_id: Option<String>,
        cover_blob_id: Option<String>,
        created_at_ms: u64,
    }

    public struct CommunityRegistry has key {
        id: UID,
        handle_to_community: Table<String, ID>,
    }

    public struct CommunityMembership has key, store {
        id: UID,
        community_id: ID,
        member: address,
        joined_at_ms: u64,
    }

    public struct CommunityMembers has key {
        id: UID,
        members: Table<address, bool>,
    }

    fun init(ctx: &mut TxContext) {
        let community_registry = CommunityRegistry {
            id: object::new(ctx),
            handle_to_community: table::new(ctx),
        };
        transfer::share_object(community_registry);
    }

    entry fun create_community(
        global_registry: &mut GlobalRegistry,
        community_registry: &mut CommunityRegistry,
        name: String,
        handle: String,
        description: String,
        privacy: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {

        let name_length = name.length();
        assert!(name_length >= MIN_NAME_LENGTH, ENameTooShort);
        assert!(name_length <= MAX_NAME_LENGTH, ENameTooLong);

        let handle_length = handle.length();
        assert!(handle_length >= MIN_HANDLE_LENGTH, EHandleTooShort);
        assert!(handle_length <= MAX_HANDLE_LENGTH, EHandleTooLong);

        let description_length = description.length();
        assert!(description_length <= MAX_DESCRIPTION_LENGTH, EDescriptionTooLong);

        assert!(privacy <= 1, 0);

        assert!(!table::contains(&community_registry.handle_to_community, handle), EHandleExists);

        let sender = ctx.sender();
        let timestamp_ms = clock.timestamp_ms();

        let mut members = CommunityMembers {
            id: object::new(ctx),
            members: table::new(ctx),
        };

        table::add(&mut members.members, sender, true);

        let community = Community {
            id: object::new(ctx),
            name,
            handle: handle,
            description,
            creator: sender,
            privacy,
            members_count: 1, 
            thumbnail_blob_id: option::none(),
            cover_blob_id: option::none(),
            created_at_ms: timestamp_ms,
        };

        let community_id = object::id(&community);

        table::add(&mut community_registry.handle_to_community, handle, community_id);

        increment_communities(global_registry);

        emit_community_created(community_id, sender, name, handle, timestamp_ms);

        transfer::share_object(community);
        transfer::share_object(members);
    }

    entry fun create_community_with_media(
        global_registry: &mut GlobalRegistry,
        community_registry: &mut CommunityRegistry,
        name: String,
        handle: String,
        description: String,
        privacy: u8,
        thumbnail_blob_id: String,
        cover_blob_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {

        let name_length = name.length();
        assert!(name_length >= MIN_NAME_LENGTH, ENameTooShort);
        assert!(name_length <= MAX_NAME_LENGTH, ENameTooLong);

        let handle_length = handle.length();
        assert!(handle_length >= MIN_HANDLE_LENGTH, EHandleTooShort);
        assert!(handle_length <= MAX_HANDLE_LENGTH, EHandleTooLong);

        let description_length = description.length();
        assert!(description_length <= MAX_DESCRIPTION_LENGTH, EDescriptionTooLong);

        assert!(privacy <= 1, 0);

        assert!(!table::contains(&community_registry.handle_to_community, handle), EHandleExists);

        let sender = ctx.sender();
        let timestamp_ms = clock.timestamp_ms();

        let mut members = CommunityMembers {
            id: object::new(ctx),
            members: table::new(ctx),
        };

        table::add(&mut members.members, sender, true);

        let community = Community {
            id: object::new(ctx),
            name,
            handle: handle,
            description,
            creator: sender,
            privacy,
            members_count: 1, 
            thumbnail_blob_id: if (thumbnail_blob_id.length() > 0) option::some(thumbnail_blob_id) else option::none(),
            cover_blob_id: if (cover_blob_id.length() > 0) option::some(cover_blob_id) else option::none(),
            created_at_ms: timestamp_ms,
        };

        let community_id = object::id(&community);

        table::add(&mut community_registry.handle_to_community, handle, community_id);

        increment_communities(global_registry);

        emit_community_created(community_id, sender, name, handle, timestamp_ms);

        transfer::share_object(community);
        transfer::share_object(members);
    }

    public fun id(community: &Community): ID {
        object::id(community)
    }

    public fun name(community: &Community): String {
        community.name
    }

    public fun handle(community: &Community): String {
        community.handle
    }

    public fun description(community: &Community): String {
        community.description
    }

    public fun creator(community: &Community): address {
        community.creator
    }

    public fun privacy(community: &Community): u8 {
        community.privacy
    }

    public fun members_count(community: &Community): u64 {
        community.members_count
    }

    public fun thumbnail_blob_id(community: &Community): &Option<String> {
        &community.thumbnail_blob_id
    }

    public fun cover_blob_id(community: &Community): &Option<String> {
        &community.cover_blob_id
    }

    public fun created_at_ms(community: &Community): u64 {
        community.created_at_ms
    }

    public fun get_community_by_handle(
        registry: &CommunityRegistry,
        handle: String
    ): Option<ID> {
        if (table::contains(&registry.handle_to_community, handle)) {
            option::some(*table::borrow(&registry.handle_to_community, handle))
        } else {
            option::none()
        }
    }

    entry fun join_community(
        community: &mut Community,
        members: &mut CommunityMembers,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();

        assert!(!table::contains(&members.members, sender), EAlreadyMember);

        table::add(&mut members.members, sender, true);

        community.members_count = community.members_count + 1;

        let membership = CommunityMembership {
            id: object::new(ctx),
            community_id: object::id(community),
            member: sender,
            joined_at_ms: clock.timestamp_ms(),
        };

        transfer::transfer(membership, sender);
    }

    entry fun leave_community(
        community: &mut Community,
        members: &mut CommunityMembers,
        membership: CommunityMembership,
        ctx: &TxContext
    ) {
        let sender = ctx.sender();

        assert!(membership.member == sender, ENotMember);

        assert!(membership.community_id == object::id(community), ENotMember);

        assert!(table::contains(&members.members, sender), ENotMember);

        table::remove(&mut members.members, sender);

        community.members_count = community.members_count - 1;

        let CommunityMembership { id, community_id: _, member: _, joined_at_ms: _ } = membership;
        object::delete(id);
    }

    public fun is_member(members: &CommunityMembers, user: address): bool {
        table::contains(&members.members, user)
    }

    public fun get_members_id(community: &Community): ID {

        object::id(community)
    }

    entry fun create_community_post(
        global_registry: &mut GlobalRegistry,
        community: &Community,
        members: &CommunityMembers,
        content: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();

        assert!(is_member(members, sender), ENotMember);

        let suit_id = create_and_share_suit_for_community(global_registry, content, clock, ctx);

        let community_id = object::id(community);
        let timestamp = clock.timestamp_ms();

        emit_community_post_created(community_id, suit_id, sender, timestamp);
    }

    entry fun create_community_post_with_media(
        global_registry: &mut GlobalRegistry,
        community: &Community,
        members: &CommunityMembers,
        content: String,
        walrus_blob_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();

        assert!(is_member(members, sender), ENotMember);

        let suit_id = create_and_share_suit_with_media_for_community(global_registry, content, walrus_blob_id, clock, ctx);

        let community_id = object::id(community);
        let timestamp = clock.timestamp_ms();

        emit_community_post_created(community_id, suit_id, sender, timestamp);
    }
}

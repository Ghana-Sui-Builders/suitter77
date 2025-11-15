module suitter::suit {
    use std::string::{String};
    use sui::clock::{Clock};
    use suitter::suitter::{GlobalRegistry, increment_suits, emit_suit_created, register_suit};

    const EContentTooLong: u64 = 1;
    const EContentEmpty: u64 = 2;

    const MAX_CONTENT_LENGTH: u64 = 280;

    public struct Suit has key, store {
        id: UID,
        author: address,
        content: String,
        timestamp_ms: u64,
        likes_count: u64,
        comments_count: u64,
        reposts_count: u64,
        walrus_blob_id: Option<String>,
    }

    public struct SuitDisplay has copy, drop {
        name: String,
        description: String,
        image_url: String,
    }

    entry fun create_suit(
        registry: &mut GlobalRegistry,
        content: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let content_length = content.length();
        assert!(content_length > 0, EContentEmpty);
        assert!(content_length <= MAX_CONTENT_LENGTH, EContentTooLong);

        let suit = Suit {
            id: object::new(ctx),
            author: ctx.sender(),
            content,
            timestamp_ms: clock.timestamp_ms(),
            likes_count: 0,
            comments_count: 0,
            reposts_count: 0,
            walrus_blob_id: option::none(),
        };

        let suit_id = object::id(&suit);
        let timestamp = clock.timestamp_ms();

        register_suit(registry, suit_id, ctx.sender(), timestamp, false, ctx);

        increment_suits(registry);
        emit_suit_created(suit_id, ctx.sender(), timestamp);

        transfer::share_object(suit);
    }

    entry fun create_suit_with_media(
        registry: &mut GlobalRegistry,
        content: String,
        walrus_blob_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let content_length = content.length();
        assert!(content_length > 0, EContentEmpty);
        assert!(content_length <= MAX_CONTENT_LENGTH, EContentTooLong);

        let suit = Suit {
            id: object::new(ctx),
            author: ctx.sender(),
            content,
            timestamp_ms: clock.timestamp_ms(),
            likes_count: 0,
            comments_count: 0,
            reposts_count: 0,
            walrus_blob_id: option::some(walrus_blob_id),
        };

        let suit_id = object::id(&suit);
        let timestamp = clock.timestamp_ms();

        register_suit(registry, suit_id, ctx.sender(), timestamp, true, ctx);

        increment_suits(registry);
        emit_suit_created(suit_id, ctx.sender(), timestamp);

        transfer::share_object(suit);
    }

    public(package) fun increment_likes(suit: &mut Suit) {
        suit.likes_count = suit.likes_count + 1;
    }

    public(package) fun increment_comments(suit: &mut Suit) {
        suit.comments_count = suit.comments_count + 1;
    }

    public(package) fun increment_reposts(suit: &mut Suit) {
        suit.reposts_count = suit.reposts_count + 1;
    }

    public fun author(suit: &Suit): address {
        suit.author
    }

    public fun content(suit: &Suit): String {
        suit.content
    }

    public fun timestamp_ms(suit: &Suit): u64 {
        suit.timestamp_ms
    }

    public fun likes_count(suit: &Suit): u64 {
        suit.likes_count
    }

    public fun comments_count(suit: &Suit): u64 {
        suit.comments_count
    }

    public fun reposts_count(suit: &Suit): u64 {
        suit.reposts_count
    }

    public fun walrus_blob_id(suit: &Suit): &Option<String> {
        &suit.walrus_blob_id
    }

    public fun create_and_share_suit_for_community(
        registry: &mut GlobalRegistry,
        content: String,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        let content_length = content.length();
        assert!(content_length > 0, EContentEmpty);
        assert!(content_length <= MAX_CONTENT_LENGTH, EContentTooLong);

        let suit = Suit {
            id: object::new(ctx),
            author: ctx.sender(),
            content,
            timestamp_ms: clock.timestamp_ms(),
            likes_count: 0,
            comments_count: 0,
            reposts_count: 0,
            walrus_blob_id: option::none(),
        };

        let suit_id = object::id(&suit);
        let timestamp = clock.timestamp_ms();

        register_suit(registry, suit_id, ctx.sender(), timestamp, false, ctx);

        increment_suits(registry);
        emit_suit_created(suit_id, ctx.sender(), timestamp);

        transfer::share_object(suit);
        suit_id
    }

    public fun create_and_share_suit_with_media_for_community(
        registry: &mut GlobalRegistry,
        content: String,
        walrus_blob_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        let content_length = content.length();
        assert!(content_length > 0, EContentEmpty);
        assert!(content_length <= MAX_CONTENT_LENGTH, EContentTooLong);

        let suit = Suit {
            id: object::new(ctx),
            author: ctx.sender(),
            content,
            timestamp_ms: clock.timestamp_ms(),
            likes_count: 0,
            comments_count: 0,
            reposts_count: 0,
            walrus_blob_id: if (walrus_blob_id.length() > 0) option::some(walrus_blob_id) else option::none(),
        };

        let suit_id = object::id(&suit);
        let timestamp = clock.timestamp_ms();

        register_suit(registry, suit_id, ctx.sender(), timestamp, walrus_blob_id.length() > 0, ctx);

        increment_suits(registry);
        emit_suit_created(suit_id, ctx.sender(), timestamp);

        transfer::share_object(suit);
        suit_id
    }
}
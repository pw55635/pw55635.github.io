create table book
(
    id          integer not null
        constraint book_pk
            primary key autoincrement,
    title       text not null,
    author      text not null,
    description text not null
);

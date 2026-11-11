<?php
/** @var \App\Model\Book $book */
$escape = static fn (?string $value): string => htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
?>

<div class="form-group">
    <label for="title">Title</label>
    <input type="text" id="title" name="book[title]" value="<?= $escape($book->getTitle()) ?>" required>
</div>

<div class="form-group">
    <label for="author">Author</label>
    <input type="text" id="author" name="book[author]" value="<?= $escape($book->getAuthor()) ?>" required>
</div>

<div class="form-group">
    <label for="description">Description</label>
    <textarea id="description" name="book[description]" required><?= $escape($book->getDescription()) ?></textarea>
</div>

<div class="form-group">
    <label></label>
    <input type="submit" value="Submit">
</div>

<?php
/** @var \App\Model\Book[] $books */
/** @var \App\Service\Router $router */

$title = 'Book List';
$bodyClass = 'index';
$escape = static fn (?string $value): string => htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');

ob_start(); ?>
    <h1>Books List</h1>

    <a href="<?= $router->generatePath('book-create') ?>">Create new</a>

    <ul class="index-list">
        <?php foreach ($books as $book): ?>
            <li>
                <h3><?= $escape($book->getTitle()) ?></h3>
                <p>by <?= $escape($book->getAuthor()) ?></p>
                <ul class="action-list">
                    <li><a href="<?= $router->generatePath('book-show', ['id' => $book->getId()]) ?>">Details</a></li>
                    <li><a href="<?= $router->generatePath('book-edit', ['id' => $book->getId()]) ?>">Edit</a></li>
                </ul>
            </li>
        <?php endforeach; ?>
    </ul>
<?php $main = ob_get_clean();

include __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'base.html.php';

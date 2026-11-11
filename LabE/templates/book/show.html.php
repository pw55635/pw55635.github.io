<?php
/** @var \App\Model\Book $book */
/** @var \App\Service\Router $router */

$escape = static fn (?string $value): string => htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
$title = $escape($book->getTitle()) . ' (' . $book->getId() . ')';
$bodyClass = 'show';

ob_start(); ?>
    <h1><?= $escape($book->getTitle()) ?></h1>
    <p>by <?= $escape($book->getAuthor()) ?></p>
    <article><?= nl2br($escape($book->getDescription())) ?></article>

    <ul class="action-list">
        <li><a href="<?= $router->generatePath('book-index') ?>">Back to list</a></li>
        <li><a href="<?= $router->generatePath('book-edit', ['id' => $book->getId()]) ?>">Edit</a></li>
    </ul>
<?php $main = ob_get_clean();

include __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'base.html.php';

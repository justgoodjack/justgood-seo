<?php
/**
 * Static page.
 *
 * @package JustGood
 */

defined( 'ABSPATH' ) || exit;

get_header();

while ( have_posts() ) :
	the_post();
	?>
	<article <?php post_class( 'jg-article jg-article--page' ); ?>>
		<header class="jg-wrap jg-article__head">
			<h1 class="jg-article__title"><?php the_title(); ?></h1>
		</header>
		<?php if ( has_post_thumbnail() ) : ?>
			<figure class="jg-article__hero"><?php the_post_thumbnail( 'jg-cover', array( 'loading' => 'eager' ) ); ?></figure>
		<?php endif; ?>
		<div class="jg-prose"><?php the_content(); ?></div>
	</article>
	<?php
endwhile;

get_footer();

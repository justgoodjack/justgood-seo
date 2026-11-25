<?php
/**
 * Search results.
 *
 * @package JustGood
 */

defined( 'ABSPATH' ) || exit;

get_header();
global $wp_query;
?>
<header class="jg-wrap jg-archive__head">
	<p class="jg-archive__kicker">
		<?php
		/* translators: %d: number of results. */
		printf( esc_html( _n( '%d result', '%d results', (int) $wp_query->found_posts, 'justgood' ) ), (int) $wp_query->found_posts );
		?>
	</p>
	<h1 class="jg-archive__title"><?php echo esc_html( get_search_query() ); ?></h1>
	<div class="jg-archive__search"><?php get_search_form(); ?></div>
</header>

<div class="jg-wrap">
	<?php if ( have_posts() ) : ?>
		<div class="jg-search-results">
			<?php
			while ( have_posts() ) :
				the_post();
				jg_teaser(
					array(
						'variant' => 'list',
						'size'    => 'jg-square',
						'dek'     => true,
						'heading' => 'h2',
					)
				);
			endwhile;
			?>
		</div>
		<?php
		the_posts_pagination(
			array(
				'mid_size'  => 1,
				'prev_text' => jg_icon( 'left' ) . '<span class="screen-reader-text">' . esc_html__( 'Previous', 'justgood' ) . '</span>',
				'next_text' => '<span class="screen-reader-text">' . esc_html__( 'Next', 'justgood' ) . '</span>' . jg_icon( 'right' ),
				'class'     => 'jg-pagination',
			)
		);
		?>
	<?php else : ?>
		<div class="jg-empty">
			<p><?php esc_html_e( 'No stories match that search. Try a shorter word, or browse a column.', 'justgood' ); ?></p>
			<?php jg_nav_fallback(); ?>
		</div>
	<?php endif; ?>
</div>
<?php
get_footer();

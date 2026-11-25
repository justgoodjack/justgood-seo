<?php
/**
 * Fallback listing (blog index when a static front page is set, and any
 * view without a more specific template).
 *
 * @package JustGood
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<header class="jg-wrap jg-archive__head">
	<h1 class="jg-archive__title"><?php echo esc_html( is_home() && get_option( 'page_for_posts' ) ? get_the_title( get_option( 'page_for_posts' ) ) : __( 'Latest stories', 'justgood' ) ); ?></h1>
</header>

<div class="jg-wrap">
	<?php if ( have_posts() ) : ?>
		<div class="jg-grid jg-grid--archive">
			<?php
			while ( have_posts() ) :
				the_post();
				jg_teaser(
					array(
						'variant' => 'card',
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
				'prev_text' => jg_icon( 'left' ) . '<span class="screen-reader-text">' . esc_html__( 'Newer', 'justgood' ) . '</span>',
				'next_text' => '<span class="screen-reader-text">' . esc_html__( 'Older', 'justgood' ) . '</span>' . jg_icon( 'right' ),
				'class'     => 'jg-pagination',
			)
		);
		?>
	<?php else : ?>
		<div class="jg-empty"><p><?php esc_html_e( 'Nothing published yet.', 'justgood' ); ?></p></div>
	<?php endif; ?>
</div>
<?php
get_footer();

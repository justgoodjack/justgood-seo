<?php
/**
 * Column (category), tag, author and date archives.
 *
 * @package JustGood
 */

defined( 'ABSPATH' ) || exit;

get_header();

$jg_paged = max( 1, (int) get_query_var( 'paged' ) );
?>
<header class="jg-wrap jg-archive__head">
	<?php if ( is_category() ) : ?>
		<p class="jg-archive__kicker"><?php esc_html_e( 'Column', 'justgood' ); ?></p>
	<?php endif; ?>
	<h1 class="jg-archive__title">
		<?php
		if ( is_category() || is_tag() ) {
			single_term_title();
		} elseif ( is_author() ) {
			the_author_meta( 'display_name', (int) get_query_var( 'author' ) );
		} else {
			the_archive_title();
		}
		?>
	</h1>
	<?php
	$jg_desc = get_the_archive_description();
	if ( $jg_desc ) :
		?>
		<div class="jg-archive__desc"><?php echo wp_kses_post( $jg_desc ); ?></div>
	<?php endif; ?>
</header>

<?php if ( have_posts() ) : ?>
	<div class="jg-wrap">
		<?php
		if ( 1 === $jg_paged ) :
			the_post();
			?>
			<div class="jg-archive__lead">
				<?php
				jg_teaser(
					array(
						'variant' => 'feature',
						'size'    => 'jg-wide',
						'dek'     => true,
						'heading' => 'h2',
						'loading' => 'eager',
					)
				);
				?>
			</div>
		<?php endif; ?>

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
	</div>
<?php else : ?>
	<div class="jg-wrap jg-empty">
		<p><?php esc_html_e( 'No stories here yet. New ones land every week.', 'justgood' ); ?></p>
		<a class="jg-btn" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Back to the front page', 'justgood' ); ?></a>
	</div>
<?php endif; ?>

<?php
get_footer();

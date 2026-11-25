<?php
/**
 * Homepage: cover, the tagline with four section doors, then one colored
 * "room" per column. Each room has its own composition.
 *
 * @package JustGood
 */

defined( 'ABSPATH' ) || exit;

get_header();

$jg_uncat     = (int) get_option( 'default_category' );
$jg_cover_ids = array();

/* ---------- Cover ---------- */
$jg_cover = new WP_Query(
	array(
		'posts_per_page'      => 3,
		'category__not_in'    => array( $jg_uncat ),
		'ignore_sticky_posts' => false,
		'no_found_rows'       => true,
	)
);

if ( $jg_cover->have_posts() ) :
	?>
	<section class="jg-cover" aria-label="<?php esc_attr_e( 'Cover stories', 'justgood' ); ?>">
		<div class="jg-wrap jg-cover__grid">
			<?php
			$jg_i = 0;
			while ( $jg_cover->have_posts() ) :
				$jg_cover->the_post();
				$jg_cover_ids[] = get_the_ID();
				if ( 0 === $jg_i ) {
					jg_teaser(
						array(
							'variant' => 'lead',
							'size'    => 'jg-cover',
							'dek'     => true,
							'heading' => 'h2',
							'loading' => 'eager',
						)
					);
					echo '<div class="jg-cover__side">';
				} else {
					jg_teaser(
						array(
							'variant' => 'side',
							'size'    => 'jg-wide',
							'loading' => 'eager',
						)
					);
				}
				++$jg_i;
			endwhile;
			if ( $jg_i > 0 ) {
				echo '</div>';
			}
			wp_reset_postdata();
			?>
		</div>
	</section>
	<?php
endif;

/* ---------- Tagline and the four doors ---------- */
$jg_cols = array();
foreach ( jg_columns() as $jg_slug ) {
	$jg_c = get_category_by_slug( $jg_slug );
	if ( $jg_c ) {
		$jg_cols[ $jg_slug ] = $jg_c;
	}
}

if ( $jg_cols ) :
	$jg_word = function ( $slug, $label, $after = '' ) use ( $jg_cols ) {
		$word = empty( $jg_cols[ $slug ] )
			? esc_html( $label )
			: sprintf( '<a class="jg-tagline__word" data-col="%1$s" href="%2$s">%3$s</a>', esc_attr( $slug ), esc_url( get_category_link( $jg_cols[ $slug ] ) ), esc_html( $label ) );
		return '<span class="jg-tagline__unit">' . $word . esc_html( $after ) . '</span>';
	};
	?>
	<section class="jg-doors jg-reveal" aria-labelledby="jg-tagline">
		<div class="jg-wrap">
			<h2 class="jg-tagline" id="jg-tagline">
				<?php
				// The site tagline: "Smart travel, better health, useful tech, and real advice."
				echo esc_html__( 'Smart', 'justgood' ) . ' ' . $jg_word( 'travel', __( 'travel', 'justgood' ), ',' ) . ' '; // phpcs:ignore
				echo esc_html__( 'better', 'justgood' ) . ' ' . $jg_word( 'health', __( 'health', 'justgood' ), ',' ) . ' '; // phpcs:ignore
				echo esc_html__( 'useful', 'justgood' ) . ' ' . $jg_word( 'tech', __( 'tech', 'justgood' ), ',' ) . ' '; // phpcs:ignore
				echo esc_html__( 'and real', 'justgood' ) . ' ' . $jg_word( 'advice', __( 'advice', 'justgood' ), '.' ); // phpcs:ignore
				?>
			</h2>

			<div class="jg-doors__grid">
				<?php
				foreach ( $jg_cols as $jg_slug => $jg_c ) :
					$jg_latest = get_posts(
						array(
							'category_name'  => $jg_slug,
							'posts_per_page' => 1,
							'meta_key'       => '_thumbnail_id', // phpcs:ignore
						)
					);
					?>
					<a class="jg-door" data-col="<?php echo esc_attr( $jg_slug ); ?>" href="<?php echo esc_url( get_category_link( $jg_c ) ); ?>">
						<span class="jg-door__art">
							<?php
							if ( $jg_latest ) {
								echo get_the_post_thumbnail( $jg_latest[0], 'jg-tall', array( 'loading' => 'lazy', 'alt' => '' ) );
							}
							?>
						</span>
						<span class="jg-door__name"><?php echo esc_html( $jg_c->name ); ?></span>
						<span class="jg-door__desc"><?php echo esc_html( $jg_c->description ); ?></span>
						<span class="jg-door__go">
							<?php
							/* translators: %d: number of stories. */
							printf( esc_html( _n( '%d story', '%d stories', (int) $jg_c->count, 'justgood' ) ), (int) $jg_c->count );
							?>
							<?php echo jg_icon( 'arrow' ); // phpcs:ignore ?>
						</span>
					</a>
				<?php endforeach; ?>
			</div>
		</div>
	</section>
	<?php
endif;

/* ---------- The rooms ---------- */
?>
<div class="jg-rooms">
<?php
foreach ( array( 'travel', 'health', 'tech', 'advice' ) as $jg_slug ) :
	if ( empty( $jg_cols[ $jg_slug ] ) ) {
		continue;
	}
	$jg_c = $jg_cols[ $jg_slug ];
	$jg_q = jg_column_query( $jg_slug, 'tech' === $jg_slug ? 8 : 4, $jg_cover_ids );
	if ( ! $jg_q->have_posts() ) {
		$jg_q = jg_column_query( $jg_slug, 4, array() );
	}
	if ( ! $jg_q->have_posts() ) {
		continue;
	}
	$jg_layout = array(
		'travel' => 'overlap',
		'health' => 'mirror',
		'tech'   => 'scroll',
		'advice' => 'mosaic',
	)[ $jg_slug ];
	?>
	<section class="jg-room jg-room--<?php echo esc_attr( $jg_layout ); ?>" data-col="<?php echo esc_attr( $jg_slug ); ?>" id="<?php echo esc_attr( $jg_slug ); ?>" aria-label="<?php echo esc_attr( $jg_c->name ); ?>">
		<div class="jg-wrap">
			<?php jg_room_word( $jg_c ); ?>

			<?php if ( 'overlap' === $jg_layout || 'mirror' === $jg_layout ) : ?>
				<div class="jg-room__body">
					<div class="jg-room__lead">
						<?php
						$jg_q->the_post();
						jg_teaser(
							array(
								'variant' => 'roomlead',
								'size'    => 'mirror' === $jg_layout ? 'jg-tall' : 'jg-wide',
								'dek'     => true,
							)
						);
						?>
					</div>
					<div class="jg-room__side">
						<p class="jg-room__intro"><?php echo esc_html( $jg_c->description ); ?></p>
						<?php if ( $jg_q->have_posts() ) : ?>
							<div class="jg-room__list">
								<?php
								while ( $jg_q->have_posts() ) :
									$jg_q->the_post();
									jg_teaser(
										array(
											'variant' => 'list',
											'size'    => 'jg-square',
											'dek'     => true,
										)
									);
								endwhile;
								?>
							</div>
						<?php endif; ?>
						<?php jg_room_link( $jg_c ); ?>
					</div>
				</div>

			<?php elseif ( 'scroll' === $jg_layout ) : ?>
				<div class="jg-room__bar">
					<p class="jg-room__intro"><?php echo esc_html( $jg_c->description ); ?></p>
					<?php jg_room_link( $jg_c ); ?>
				</div>
			</div>
			<div class="jg-scroller" data-scroller>
				<div class="jg-scroller__track" data-scroller-track tabindex="0" aria-label="<?php echo esc_attr( $jg_c->name ); ?>">
					<?php
					while ( $jg_q->have_posts() ) :
						$jg_q->the_post();
						jg_teaser(
							array(
								'variant' => 'poster',
								'size'    => 'jg-tall',
								'dek'     => true,
							)
						);
					endwhile;
					?>
				</div>
				<div class="jg-wrap jg-scroller__controls">
					<button class="jg-iconbtn jg-iconbtn--ring" type="button" data-scroller-prev><?php echo jg_icon( 'left' ); // phpcs:ignore ?><span class="screen-reader-text"><?php esc_html_e( 'Previous', 'justgood' ); ?></span></button>
					<button class="jg-iconbtn jg-iconbtn--ring" type="button" data-scroller-next><?php echo jg_icon( 'right' ); // phpcs:ignore ?><span class="screen-reader-text"><?php esc_html_e( 'Next', 'justgood' ); ?></span></button>
				</div>
			<div class="jg-wrap">

			<?php else : ?>
				<div class="jg-advice__mosaic jg-advice__mosaic--<?php echo esc_attr( min( 4, $jg_q->post_count ) ); ?>">
					<?php
					$jg_i = 0;
					while ( $jg_q->have_posts() ) :
						$jg_q->the_post();
						jg_teaser(
							array(
								'variant' => 0 === $jg_i ? 'overlay' : 'card',
								'size'    => 0 === $jg_i ? 'jg-tall' : 'jg-card',
								'dek'     => true,
							)
						);
						++$jg_i;
					endwhile;
					?>
				</div>
				<div class="jg-room__bar jg-room__bar--end">
					<p class="jg-room__intro"><?php echo esc_html( $jg_c->description ); ?></p>
					<?php jg_room_link( $jg_c ); ?>
				</div>
			<?php endif; ?>
		</div>
		<?php wp_reset_postdata(); ?>
	</section>
	<?php
endforeach;
?>
</div>
<?php
get_footer();

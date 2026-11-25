<?php
/**
 * Homepage: a magazine front, one layout family per section.
 *
 * @package JustGood
 */

defined( 'ABSPATH' ) || exit;

get_header();

$jg_shown     = array();
$jg_cover_ids = array();
$jg_uncat = (int) get_option( 'default_category' );

/**
 * Section header shared by the column sections.
 *
 * @param WP_Term $cat   Column.
 * @param string  $class Extra class.
 */
$jg_section_head = function ( $cat, $class = '' ) {
	?>
	<header class="jg-section__head <?php echo esc_attr( $class ); ?>">
		<h2 class="jg-section__title"><a href="<?php echo esc_url( get_category_link( $cat ) ); ?>"><?php echo esc_html( $cat->name ); ?></a></h2>
		<?php if ( $cat->description ) : ?>
			<p class="jg-section__desc"><?php echo esc_html( $cat->description ); ?></p>
		<?php endif; ?>
		<a class="jg-more" href="<?php echo esc_url( get_category_link( $cat ) ); ?>">
			<?php
			/* translators: %s: column name. */
			printf( esc_html__( 'All %s', 'justgood' ), esc_html( strtolower( $cat->name ) ) );
			?>
			<?php echo jg_icon( 'arrow' ); // phpcs:ignore ?>
		</a>
	</header>
	<?php
};

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
				$jg_shown[] = get_the_ID();
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
			$jg_cover_ids = $jg_shown;
			?>
		</div>
	</section>
	<?php
endif;

/* ---------- Just in ---------- */
$jg_latest = new WP_Query(
	array(
		'posts_per_page'      => 4,
		'post__not_in'        => $jg_shown,
		'category__not_in'    => array( $jg_uncat ),
		'ignore_sticky_posts' => true,
		'no_found_rows'       => true,
	)
);
if ( $jg_latest->have_posts() ) :
	?>
	<section class="jg-latest jg-reveal" aria-labelledby="jg-latest-title">
		<div class="jg-wrap">
			<h2 class="jg-latest__title" id="jg-latest-title"><?php esc_html_e( 'Just in', 'justgood' ); ?></h2>
			<div class="jg-latest__rail">
				<?php
				while ( $jg_latest->have_posts() ) :
					$jg_latest->the_post();
					$jg_shown[] = get_the_ID();
					jg_teaser(
						array(
							'variant' => 'mini',
							'size'    => 'jg-square',
						)
					);
				endwhile;
				wp_reset_postdata();
				?>
			</div>
		</div>
	</section>
	<?php
endif;

/* ---------- Travel: cinematic band ---------- */
$jg_cat = get_category_by_slug( 'travel' );
if ( $jg_cat ) :
	$jg_q = jg_column_query( 'travel', 3, $jg_cover_ids );
	if ( $jg_q->have_posts() ) :
		?>
		<section class="jg-section jg-travel jg-reveal" aria-label="<?php echo esc_attr( $jg_cat->name ); ?>">
			<div class="jg-wrap"><?php $jg_section_head( $jg_cat ); ?></div>
			<?php
			$jg_q->the_post();
			$jg_shown[] = get_the_ID();
			?>
			<div class="jg-travel__band">
				<a class="jg-travel__feature" href="<?php the_permalink(); ?>">
					<?php jg_image( 'jg-cover' ); ?>
					<div class="jg-wrap jg-travel__panel">
						<div class="jg-travel__text">
							<h3 class="jg-travel__title"><?php the_title(); ?></h3>
							<p class="jg-travel__dek"><?php echo esc_html( jg_dek() ); ?></p>
							<span class="jg-btn jg-btn--light"><?php esc_html_e( 'Read the story', 'justgood' ); ?></span>
						</div>
					</div>
				</a>
			</div>
			<?php if ( $jg_q->have_posts() ) : ?>
				<div class="jg-wrap jg-travel__more">
					<?php
					while ( $jg_q->have_posts() ) :
						$jg_q->the_post();
						$jg_shown[] = get_the_ID();
						jg_teaser(
							array(
								'variant' => 'row',
								'size'    => 'jg-card',
								'dek'     => true,
							)
						);
					endwhile;
					?>
				</div>
			<?php endif; ?>
			<?php wp_reset_postdata(); ?>
		</section>
		<?php
	endif;
endif;

/* ---------- Health: split ---------- */
$jg_cat = get_category_by_slug( 'health' );
if ( $jg_cat ) :
	$jg_q = jg_column_query( 'health', 4, $jg_cover_ids );
	if ( $jg_q->have_posts() ) :
		?>
		<section class="jg-section jg-health jg-reveal" aria-label="<?php echo esc_attr( $jg_cat->name ); ?>">
			<div class="jg-wrap">
				<?php $jg_section_head( $jg_cat ); ?>
				<div class="jg-health__grid">
					<?php
					$jg_q->the_post();
					$jg_shown[] = get_the_ID();
					jg_teaser(
						array(
							'variant' => 'tall',
							'size'    => 'jg-tall',
							'dek'     => true,
						)
					);
					?>
					<div class="jg-health__list">
						<?php
						while ( $jg_q->have_posts() ) :
							$jg_q->the_post();
							$jg_shown[] = get_the_ID();
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
				</div>
			</div>
			<?php wp_reset_postdata(); ?>
		</section>
		<?php
	endif;
endif;

/* ---------- Tech: dark scroller ---------- */
$jg_cat = get_category_by_slug( 'tech' );
if ( $jg_cat ) :
	$jg_q = jg_column_query( 'tech', 6, $jg_cover_ids );
	if ( $jg_q->have_posts() ) :
		?>
		<section class="jg-section jg-tech jg-reveal" aria-label="<?php echo esc_attr( $jg_cat->name ); ?>">
			<div class="jg-wrap">
				<?php $jg_section_head( $jg_cat, 'jg-section__head--dark' ); ?>
			</div>
			<div class="jg-scroller" data-scroller>
				<div class="jg-scroller__track" data-scroller-track tabindex="0" aria-label="<?php echo esc_attr( $jg_cat->name ); ?>">
					<?php
					while ( $jg_q->have_posts() ) :
						$jg_q->the_post();
						$jg_shown[] = get_the_ID();
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
			</div>
			<?php wp_reset_postdata(); ?>
		</section>
		<?php
	endif;
endif;

/* ---------- Advice: mosaic ---------- */
$jg_cat = get_category_by_slug( 'advice' );
if ( $jg_cat ) :
	$jg_q = jg_column_query( 'advice', 4, $jg_cover_ids );
	if ( $jg_q->have_posts() ) :
		?>
		<section class="jg-section jg-advice jg-reveal" aria-label="<?php echo esc_attr( $jg_cat->name ); ?>">
			<div class="jg-wrap">
				<?php $jg_section_head( $jg_cat ); ?>
				<div class="jg-advice__mosaic jg-advice__mosaic--<?php echo esc_attr( $jg_q->post_count ); ?>">
					<?php
					$jg_i = 0;
					while ( $jg_q->have_posts() ) :
						$jg_q->the_post();
						$jg_shown[] = get_the_ID();
						jg_teaser(
							array(
								'variant' => 0 === $jg_i ? 'overlay' : 'card',
								'size'    => 0 === $jg_i ? 'jg-tall' : 'jg-card',
								'dek'     => 0 === $jg_i,
							)
						);
						++$jg_i;
					endwhile;
					?>
				</div>
			</div>
			<?php wp_reset_postdata(); ?>
		</section>
		<?php
	endif;
endif;

get_footer();

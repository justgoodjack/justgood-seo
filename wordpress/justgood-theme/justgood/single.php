<?php
/**
 * Single article.
 *
 * @package JustGood
 */

defined( 'ABSPATH' ) || exit;

get_header();

while ( have_posts() ) :
	the_post();
	$jg_cat = jg_primary_category();
	?>
	<div class="jg-progress" aria-hidden="true"><span data-progress></span></div>

	<article <?php post_class( 'jg-article' ); ?>>
		<div class="jg-article__top">
		<header class="jg-wrap jg-article__head">
			<?php jg_column_label( null, true ); ?>
			<h1 class="jg-article__title"><?php the_title(); ?></h1>
			<?php if ( has_excerpt() ) : ?>
				<p class="jg-article__dek"><?php echo esc_html( get_the_excerpt() ); ?></p>
			<?php endif; ?>
			<p class="jg-article__byline">
				<span><?php esc_html_e( 'By', 'justgood' ); ?> <a href="<?php echo esc_url( get_author_posts_url( get_the_author_meta( 'ID' ) ) ); ?>"><?php the_author(); ?></a></span>
				<time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date( 'F j, Y' ) ); ?></time>
				<span><?php echo esc_html( jg_reading_minutes() ); ?> min read</span>
			</p>
		</header>

		<?php if ( has_post_thumbnail() ) : ?>
			<figure class="jg-article__hero">
				<?php the_post_thumbnail( 'jg-cover', array( 'loading' => 'eager', 'fetchpriority' => 'high' ) ); ?>
				<?php
				$jg_caption = get_the_post_thumbnail_caption();
				if ( $jg_caption ) :
					?>
					<figcaption><?php echo wp_kses_post( $jg_caption ); ?></figcaption>
				<?php endif; ?>
			</figure>
		<?php endif; ?>
		</div>

		<div class="jg-prose">
			<?php
			the_content();
			wp_link_pages(
				array(
					'before' => '<nav class="jg-pages">',
					'after'  => '</nav>',
				)
			);
			?>
		</div>

		<footer class="jg-article__foot">
			<?php
			$jg_tags = get_the_tags();
			if ( $jg_tags ) :
				?>
				<ul class="jg-tags">
					<?php foreach ( $jg_tags as $jg_tag ) : ?>
						<li><a href="<?php echo esc_url( get_tag_link( $jg_tag ) ); ?>"><?php echo esc_html( $jg_tag->name ); ?></a></li>
					<?php endforeach; ?>
				</ul>
			<?php endif; ?>
			<?php if ( $jg_cat && 'health' === $jg_cat->slug ) : ?>
				<p class="jg-note"><?php esc_html_e( 'This story is general information, not medical advice. Talk to a doctor about your own health.', 'justgood' ); ?></p>
			<?php endif; ?>
		</footer>

		<?php if ( comments_open() || get_comments_number() ) : ?>
			<div class="jg-comments-wrap"><?php comments_template(); ?></div>
		<?php endif; ?>
	</article>

	<?php
	if ( $jg_cat ) :
		$jg_more = jg_column_query( $jg_cat->slug, 4, array( get_the_ID() ) );
		if ( $jg_more->have_posts() ) :
			?>
			<section class="jg-room jg-room--more" data-col="<?php echo esc_attr( $jg_cat->slug ); ?>" aria-labelledby="jg-more-title">
				<div class="jg-wrap">
					<p class="jg-room__kicker" id="jg-more-title"><?php esc_html_e( 'More from', 'justgood' ); ?></p>
					<?php jg_room_word( $jg_cat ); ?>
					<div class="jg-grid jg-grid--4 jg-room__grid">
						<?php
						while ( $jg_more->have_posts() ) :
							$jg_more->the_post();
							jg_teaser( array( 'variant' => 'card' ) );
						endwhile;
						wp_reset_postdata();
						?>
					</div>
				</div>
			</section>
			<?php
		endif;
	endif;
endwhile;

get_footer();

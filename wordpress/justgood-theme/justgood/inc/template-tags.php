<?php
/**
 * Template helpers for Just Good.
 *
 * @package JustGood
 */

defined( 'ABSPATH' ) || exit;

/**
 * The four magazine columns, in menu order.
 *
 * @return string[] Category slugs.
 */
function jg_columns() {
	return array( 'travel', 'health', 'tech', 'advice' );
}

/**
 * The post's column: the first of its categories that is one of the four
 * columns, otherwise its first category.
 *
 * @param int|null $post_id Post ID.
 * @return WP_Term|null
 */
function jg_primary_category( $post_id = null ) {
	$cats = get_the_category( $post_id ? $post_id : get_the_ID() );
	if ( ! $cats ) {
		return null;
	}
	foreach ( $cats as $cat ) {
		if ( in_array( $cat->slug, jg_columns(), true ) ) {
			return $cat;
		}
	}
	return $cats[0];
}

/**
 * Estimated reading time in minutes (200 words a minute, rounded up).
 *
 * @param int|null $post_id Post ID.
 * @return int
 */
function jg_reading_minutes( $post_id = null ) {
	$content = get_post_field( 'post_content', $post_id ? $post_id : get_the_ID() );
	$words   = str_word_count( wp_strip_all_tags( strip_shortcodes( $content ) ) );
	return max( 1, (int) ceil( $words / 200 ) );
}

/**
 * The dek: the post's hand-written excerpt, or a trimmed automatic one.
 *
 * @param int|null $post_id Post ID.
 * @param int      $words   Word cap for automatic excerpts.
 * @return string
 */
function jg_dek( $post_id = null, $words = 26 ) {
	$post = get_post( $post_id ? $post_id : get_the_ID() );
	if ( ! $post ) {
		return '';
	}
	if ( has_excerpt( $post ) ) {
		return wp_strip_all_tags( $post->post_excerpt );
	}
	return wp_trim_words( wp_strip_all_tags( strip_shortcodes( $post->post_content ) ), $words, '&hellip;' );
}

/**
 * Column label markup.
 *
 * @param int|null $post_id Post ID.
 * @param bool     $link    Whether to link to the column archive.
 */
function jg_column_label( $post_id = null, $link = false ) {
	$cat = jg_primary_category( $post_id );
	if ( ! $cat || 'uncategorized' === $cat->slug ) {
		return;
	}
	if ( $link ) {
		printf( '<a class="jg-label" href="%s">%s</a>', esc_url( get_category_link( $cat ) ), esc_html( $cat->name ) );
	} else {
		printf( '<span class="jg-label">%s</span>', esc_html( $cat->name ) );
	}
}

/**
 * Featured image, or an on-palette placeholder when a post has none.
 *
 * @param string   $size    Image size.
 * @param int|null $post_id Post ID.
 * @param string   $loading eager|lazy.
 */
function jg_image( $size = 'jg-card', $post_id = null, $loading = 'lazy' ) {
	$post_id = $post_id ? $post_id : get_the_ID();
	echo '<div class="jg-media">';
	if ( has_post_thumbnail( $post_id ) ) {
		echo get_the_post_thumbnail(
			$post_id,
			$size,
			array(
				'loading'       => $loading,
				'fetchpriority' => 'eager' === $loading ? 'high' : 'auto',
				'decoding'      => 'async',
			)
		);
	} else {
		echo '<span class="jg-media__placeholder" aria-hidden="true"></span>';
	}
	echo '</div>';
}

/**
 * Story meta line: reading time and date.
 *
 * @param int|null $post_id Post ID.
 */
function jg_meta( $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();
	printf(
		'<p class="jg-meta"><span>%1$s min read</span><time datetime="%2$s">%3$s</time></p>',
		esc_html( jg_reading_minutes( $post_id ) ),
		esc_attr( get_the_date( 'c', $post_id ) ),
		esc_html( get_the_date( 'M j, Y', $post_id ) )
	);
}

/**
 * A story teaser. Variants change layout through CSS only.
 *
 * @param array $args {
 *     @type string $variant  CSS modifier: card, row, lead, overlay, tall, text.
 *     @type string $size     Image size.
 *     @type bool   $dek      Show the dek.
 *     @type bool   $image    Show the image.
 *     @type string $heading  Heading tag.
 *     @type string $loading  Image loading mode.
 * }
 */
function jg_teaser( $args = array() ) {
	$a = wp_parse_args(
		$args,
		array(
			'variant' => 'card',
			'size'    => 'jg-card',
			'dek'     => false,
			'image'   => true,
			'heading' => 'h3',
			'loading' => 'lazy',
		)
	);
	$tag = in_array( $a['heading'], array( 'h1', 'h2', 'h3', 'h4' ), true ) ? $a['heading'] : 'h3';
	?>
	<article <?php post_class( 'jg-teaser jg-teaser--' . sanitize_html_class( $a['variant'] ) ); ?>>
		<a class="jg-teaser__link" href="<?php the_permalink(); ?>">
			<?php
			if ( $a['image'] ) {
				jg_image( $a['size'], null, $a['loading'] );
			}
			?>
			<div class="jg-teaser__body">
				<?php jg_column_label(); ?>
				<<?php echo $tag; // phpcs:ignore ?> class="jg-teaser__title"><?php the_title(); ?></<?php echo $tag; // phpcs:ignore ?>>
				<?php if ( $a['dek'] ) : ?>
					<p class="jg-teaser__dek"><?php echo esc_html( jg_dek() ); ?></p>
				<?php endif; ?>
				<?php jg_meta(); ?>
			</div>
		</a>
	</article>
	<?php
}

/**
 * Posts for one column, skipping IDs already shown on the page.
 *
 * @param string $slug    Category slug.
 * @param int    $count   Number of posts.
 * @param int[]  $exclude Post IDs to skip.
 * @return WP_Query
 */
function jg_column_query( $slug, $count, $exclude = array() ) {
	return new WP_Query(
		array(
			'category_name'       => $slug,
			'posts_per_page'      => $count,
			'post__not_in'        => $exclude,
			'ignore_sticky_posts' => true,
			'no_found_rows'       => true,
		)
	);
}

/**
 * Inline SVG icons used in the UI.
 *
 * @param string $name Icon name.
 * @return string
 */
function jg_icon( $name ) {
	$icons = array(
		'search' => '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-4.2-4.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
		'menu'   => '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M3 7h18M3 12h18M3 17h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
		'close'  => '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
		'arrow'  => '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
		'left'   => '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
		'right'  => '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
	);
	return $icons[ $name ] ?? '';
}

/**
 * Newsletter form markup, set in the `jg_newsletter_form` option as a
 * shortcode (for example a Hostinger Reach form). Empty until configured,
 * so the section and header button stay hidden until it is.
 *
 * @return string
 */
function jg_newsletter_form() {
	static $html = null;
	if ( null === $html ) {
		$code = trim( (string) get_option( 'jg_newsletter_form', '' ) );
		$html = $code ? trim( do_shortcode( $code ) ) : '';
	}
	return $html;
}

/**
 * Whether a working newsletter form is configured.
 *
 * @return bool
 */
function jg_has_newsletter() {
	return '' !== jg_newsletter_form();
}

/**
 * Primary nav fallback: the four columns, so the header works before a menu exists.
 */
function jg_nav_fallback() {
	echo '<ul class="jg-nav__list">';
	foreach ( jg_columns() as $slug ) {
		$cat = get_category_by_slug( $slug );
		if ( $cat ) {
			printf( '<li><a href="%s">%s</a></li>', esc_url( get_category_link( $cat ) ), esc_html( $cat->name ) );
		}
	}
	echo '</ul>';
}

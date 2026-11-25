<?php
/**
 * Just Good theme setup.
 *
 * @package JustGood
 */

defined( 'ABSPATH' ) || exit;

define( 'JG_VERSION', '1.0.2' );

require_once get_template_directory() . '/inc/template-tags.php';

/**
 * Theme supports, menus and image sizes.
 */
function jg_setup() {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' ) );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'custom-logo', array( 'height' => 80, 'width' => 320, 'flex-height' => true, 'flex-width' => true ) );
	add_theme_support( 'editor-styles' );
	add_editor_style( 'assets/css/editor.css' );

	register_nav_menus(
		array(
			'primary' => __( 'Primary menu', 'justgood' ),
			'footer'  => __( 'Footer menu', 'justgood' ),
		)
	);

	add_image_size( 'jg-cover', 1600, 1000, true );
	add_image_size( 'jg-wide', 1200, 750, true );
	add_image_size( 'jg-card', 800, 600, true );
	add_image_size( 'jg-tall', 720, 960, true );
	add_image_size( 'jg-square', 480, 480, true );
}
add_action( 'after_setup_theme', 'jg_setup' );

/**
 * Front-end assets. Fonts are preloaded and self-hosted.
 */
function jg_assets() {
	$uri = get_template_directory_uri();
	wp_enqueue_style( 'justgood', $uri . '/assets/css/main.css', array(), JG_VERSION );
	wp_enqueue_script( 'justgood', $uri . '/assets/js/main.js', array(), JG_VERSION, array( 'strategy' => 'defer', 'in_footer' => true ) );

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'jg_assets' );

/**
 * Preload the two upright faces so headlines and body render without a flash.
 */
function jg_preload_fonts() {
	// Flag JS before first paint so scroll reveals can hide content only when JS will show it again.
	wp_print_inline_script_tag( "document.documentElement.classList.add('js');" );
	$base = get_template_directory_uri() . '/assets/fonts/';
	foreach ( array( 'schibsted-grotesk-normal.woff2', 'source-serif-4-normal.woff2' ) as $file ) {
		printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( $base . $file ) );
	}
}
add_action( 'wp_head', 'jg_preload_fonts', 1 );

/**
 * Drop block-library CSS we do not use on the front end, keep it for posts.
 */
function jg_trim_block_css() {
	if ( ! is_singular() ) {
		wp_dequeue_style( 'wp-block-library' );
		wp_dequeue_style( 'global-styles' );
		wp_dequeue_style( 'classic-theme-styles' );
	}
}
add_action( 'wp_enqueue_scripts', 'jg_trim_block_css', 100 );

/**
 * Shorter, cleaner excerpts.
 */
add_filter( 'excerpt_length', fn() => 26 );
add_filter( 'excerpt_more', fn() => '&hellip;' );

/**
 * Body classes for page-level styling hooks.
 */
function jg_body_class( $classes ) {
	if ( is_singular( 'post' ) ) {
		$cat = jg_primary_category();
		if ( $cat ) {
			$classes[] = 'column-' . sanitize_html_class( $cat->slug );
		}
	}
	return $classes;
}
add_filter( 'body_class', 'jg_body_class' );

/**
 * Category archives: 13 posts so the lead + grid fills evenly.
 */
function jg_archive_query( $q ) {
	if ( is_admin() || ! $q->is_main_query() ) {
		return;
	}
	if ( $q->is_category() || $q->is_tag() || $q->is_author() ) {
		$q->set( 'posts_per_page', 13 );
	}
	if ( $q->is_search() ) {
		$q->set( 'post_type', 'post' );
	}
}
add_action( 'pre_get_posts', 'jg_archive_query' );

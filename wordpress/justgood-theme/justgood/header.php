<?php
/**
 * Site header.
 *
 * @package JustGood
 */

defined( 'ABSPATH' ) || exit;
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="theme-color" content="#FAFAF9">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="jg-skip" href="#main"><?php esc_html_e( 'Skip to content', 'justgood' ); ?></a>

<header class="jg-header" data-header>
	<div class="jg-wrap jg-header__inner">
		<a class="jg-brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home" aria-label="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
			<?php if ( has_custom_logo() ) : ?>
				<?php echo wp_get_attachment_image( get_theme_mod( 'custom_logo' ), 'full', false, array( 'class' => 'jg-brand__logo' ) ); ?>
			<?php else : ?>
				<span class="jg-brand__word">Just Good<span class="jg-brand__dot" aria-hidden="true">.</span></span>
			<?php endif; ?>
		</a>

		<nav class="jg-nav" aria-label="<?php esc_attr_e( 'Columns', 'justgood' ); ?>">
			<?php
			wp_nav_menu(
				array(
					'theme_location' => 'primary',
					'container'      => false,
					'menu_class'     => 'jg-nav__list',
					'depth'          => 1,
					'fallback_cb'    => 'jg_nav_fallback',
				)
			);
			?>
		</nav>

		<div class="jg-header__tools">
			<button class="jg-iconbtn" type="button" data-search-open aria-controls="jg-search" aria-expanded="false">
				<?php echo jg_icon( 'search' ); // phpcs:ignore ?>
				<span class="screen-reader-text"><?php esc_html_e( 'Search', 'justgood' ); ?></span>
			</button>
			<?php if ( jg_has_newsletter() ) : ?>
				<a class="jg-btn jg-btn--small jg-header__cta" href="#newsletter"><?php esc_html_e( 'Subscribe', 'justgood' ); ?></a>
			<?php endif; ?>
			<button class="jg-iconbtn jg-menu-toggle" type="button" data-menu-open aria-controls="jg-drawer" aria-expanded="false">
				<?php echo jg_icon( 'menu' ); // phpcs:ignore ?>
				<span class="screen-reader-text"><?php esc_html_e( 'Menu', 'justgood' ); ?></span>
			</button>
		</div>
	</div>
</header>

<div class="jg-search" id="jg-search" hidden data-search>
	<div class="jg-wrap jg-search__inner">
		<?php get_search_form(); ?>
		<button class="jg-iconbtn" type="button" data-search-close>
			<?php echo jg_icon( 'close' ); // phpcs:ignore ?>
			<span class="screen-reader-text"><?php esc_html_e( 'Close search', 'justgood' ); ?></span>
		</button>
	</div>
</div>

<div class="jg-drawer" id="jg-drawer" hidden data-drawer>
	<div class="jg-drawer__top jg-wrap">
		<span class="jg-brand__word">Just Good<span class="jg-brand__dot" aria-hidden="true">.</span></span>
		<button class="jg-iconbtn" type="button" data-menu-close>
			<?php echo jg_icon( 'close' ); // phpcs:ignore ?>
			<span class="screen-reader-text"><?php esc_html_e( 'Close menu', 'justgood' ); ?></span>
		</button>
	</div>
	<nav class="jg-drawer__nav jg-wrap" aria-label="<?php esc_attr_e( 'Columns', 'justgood' ); ?>">
		<?php
		wp_nav_menu(
			array(
				'theme_location' => 'primary',
				'container'      => false,
				'menu_class'     => 'jg-nav__list',
				'depth'          => 1,
				'fallback_cb'    => 'jg_nav_fallback',
			)
		);
		?>
	</nav>
	<div class="jg-wrap jg-drawer__search"><?php get_search_form(); ?></div>
</div>

<main id="main" class="jg-main">

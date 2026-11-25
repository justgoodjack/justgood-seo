<?php
/**
 * Not found.
 *
 * @package JustGood
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<section class="jg-wrap jg-404">
	<p class="jg-404__code">404</p>
	<h1 class="jg-archive__title"><?php esc_html_e( 'This page wandered off.', 'justgood' ); ?></h1>
	<p class="jg-404__text"><?php esc_html_e( 'Search for what you were after, or pick a column.', 'justgood' ); ?></p>
	<div class="jg-archive__search"><?php get_search_form(); ?></div>
	<?php jg_nav_fallback(); ?>
</section>
<?php
get_footer();

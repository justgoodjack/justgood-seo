<?php
/**
 * Search form.
 *
 * @package JustGood
 */

defined( 'ABSPATH' ) || exit;

$jg_id = wp_unique_id( 'jg-s-' );
?>
<form role="search" method="get" class="jg-searchform" action="<?php echo esc_url( home_url( '/' ) ); ?>">
	<label class="screen-reader-text" for="<?php echo esc_attr( $jg_id ); ?>"><?php esc_html_e( 'Search stories', 'justgood' ); ?></label>
	<input type="search" id="<?php echo esc_attr( $jg_id ); ?>" class="jg-searchform__input" placeholder="<?php esc_attr_e( 'Search stories', 'justgood' ); ?>" value="<?php echo esc_attr( get_search_query() ); ?>" name="s">
	<button type="submit" class="jg-searchform__btn"><?php echo jg_icon( 'search' ); // phpcs:ignore ?><span class="screen-reader-text"><?php esc_html_e( 'Search', 'justgood' ); ?></span></button>
</form>

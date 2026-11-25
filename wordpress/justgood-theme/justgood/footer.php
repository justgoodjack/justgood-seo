<?php
/**
 * Site footer.
 *
 * @package JustGood
 */

defined( 'ABSPATH' ) || exit;
?>
</main>

<?php if ( jg_has_newsletter() ) : ?>
<section class="jg-newsletter" id="newsletter" aria-labelledby="jg-newsletter-title">
	<div class="jg-wrap jg-newsletter__inner">
		<div class="jg-newsletter__copy">
			<h2 id="jg-newsletter-title" class="jg-newsletter__title">The good stuff, <em>once a week.</em></h2>
			<p>One email every Sunday with our best new stories on travel, health, tech and everyday decisions. No spam, and you can leave any time.</p>
		</div>
		<div class="jg-newsletter__form"><?php echo jg_newsletter_form(); // phpcs:ignore ?></div>
	</div>
</section>
<?php endif; ?>

<footer class="jg-footer">
	<div class="jg-wrap">
		<div class="jg-footer__top">
			<a class="jg-brand jg-brand--footer" href="<?php echo esc_url( home_url( '/' ) ); ?>">
				<span class="jg-brand__word">Just Good<span class="jg-brand__dot" aria-hidden="true">.</span></span>
			</a>
			<p class="jg-footer__about"><?php echo esc_html( get_bloginfo( 'description' ) ? get_bloginfo( 'description' ) : 'Useful stories for a good life: travel, health, tech and advice.' ); ?></p>
		</div>

		<div class="jg-footer__cols">
			<nav aria-label="<?php esc_attr_e( 'Columns', 'justgood' ); ?>">
				<h2 class="jg-footer__head"><?php esc_html_e( 'Read', 'justgood' ); ?></h2>
				<?php jg_nav_fallback(); ?>
			</nav>
			<?php if ( has_nav_menu( 'footer' ) || get_privacy_policy_url() ) : ?>
				<nav aria-label="<?php esc_attr_e( 'Site', 'justgood' ); ?>">
					<h2 class="jg-footer__head"><?php esc_html_e( 'Just Good', 'justgood' ); ?></h2>
					<?php if ( has_nav_menu( 'footer' ) ) : ?>
						<?php
						wp_nav_menu(
							array(
								'theme_location' => 'footer',
								'container'      => false,
								'menu_class'     => 'jg-nav__list',
								'depth'          => 1,
							)
						);
						?>
					<?php else : ?>
						<ul class="jg-nav__list"><li><a href="<?php echo esc_url( get_privacy_policy_url() ); ?>"><?php esc_html_e( 'Privacy policy', 'justgood' ); ?></a></li></ul>
					<?php endif; ?>
				</nav>
			<?php endif; ?>
		</div>

		<p class="jg-footer__legal">&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> Just Good. <?php esc_html_e( 'Health stories are general information, not medical advice.', 'justgood' ); ?></p>
	</div>
</footer>

<?php wp_footer(); ?>
</body>
</html>

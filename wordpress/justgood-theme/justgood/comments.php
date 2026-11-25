<?php
/**
 * Comments.
 *
 * @package JustGood
 */

defined( 'ABSPATH' ) || exit;

if ( post_password_required() ) {
	return;
}
?>
<section class="jg-comments" id="comments">
	<?php if ( have_comments() ) : ?>
		<h2 class="jg-comments__title">
			<?php
			/* translators: %d: comment count. */
			printf( esc_html( _n( '%d comment', '%d comments', get_comments_number(), 'justgood' ) ), (int) get_comments_number() );
			?>
		</h2>
		<ol class="jg-comments__list">
			<?php
			wp_list_comments(
				array(
					'style'       => 'ol',
					'short_ping'  => true,
					'avatar_size' => 40,
				)
			);
			?>
		</ol>
		<?php the_comments_navigation(); ?>
	<?php endif; ?>

	<?php
	comment_form(
		array(
			'title_reply'        => __( 'Join the conversation', 'justgood' ),
			'class_submit'       => 'jg-btn',
			'comment_notes_before' => '',
		)
	);
	?>
</section>

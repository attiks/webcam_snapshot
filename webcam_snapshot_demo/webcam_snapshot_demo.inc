<?php
function webcam_snapshot_demo_form($form_state) {
  return array(
    'snapshot' => array(
      '#type' => 'webcam_snapshot',
      '#title' => 'Your photo',
      '#description' => 'Centre yourself within the frame and then click "Capture" to take a snapshot. You may resize the frame as appropriate.',
      '#default_value' => isset($form_state['storage']['snapshot'])?$form_state['storage']['snapshot']:NULL,
    ),
    'save' => array(
      '#type' => 'submit',
      '#value' => t('Submit'),
    ),
  );
}

function webcam_snapshot_demo_form_submit($form, &$form_state) {
  drupal_set_message('Image uploaded: <img src="' . $form_state['values']['snapshot'] . '" />');
  $form_state['storage']['snapshot'] = $form_state['values']['snapshot'];
}
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import {
  CancellationAlert,
  CancellationAlertContent,
  CancelButton,
  ConfirmButton,
} from './styles';

export default function Alert({
  visible,
  children,
  handler,
  handlerParam,
  handlerConfirm,
  handlerConfirmParam,
}) {
  const [open, setOpen] = useState(false);
  const [blur, setBlur] = useState(false);

  useEffect(() => {
    if (!open && visible) {
      setOpen(true);
    }
  }, [visible]);

  function handleToggleFocusAlert() {
    setBlur(false);
  }

  function handleToggleBlurAlert() {
    setBlur(true);
  }

  function handleToggleClickOutAlert() {
    if (open && blur) {
      setOpen(false);
      setBlur(false);
      handler(handlerParam);
    }
  }

  function close() {
    if (open && visible) {
      setOpen(false);
      handler(handlerParam);
    }
  }

  function confirm() {
    if (open && visible) {
      handlerConfirm(handlerConfirmParam);
      setOpen(false);
      handler(handlerParam);
    }
  }

  return (
    <CancellationAlert
      visible={open}
      onClick={() => handleToggleClickOutAlert()}
    >
      <CancellationAlertContent
        onMouseEnter={() => handleToggleFocusAlert()}
        onMouseLeave={() => handleToggleBlurAlert()}
      >
        <h3>Atenção!!!</h3>
        {children}
        <div>
          <ConfirmButton onClick={confirm}>Sim</ConfirmButton>
          <CancelButton onClick={close}>Não</CancelButton>
        </div>
      </CancellationAlertContent>
    </CancellationAlert>
  );
}

Alert.propTypes = {
  visible: PropTypes.bool.isRequired,
  children: PropTypes.element.isRequired,
  handler: PropTypes.func.isRequired,
  handlerParam: PropTypes.number.isRequired,
  handlerConfirm: PropTypes.func.isRequired,
  handlerConfirmParam: PropTypes.number.isRequired,
};

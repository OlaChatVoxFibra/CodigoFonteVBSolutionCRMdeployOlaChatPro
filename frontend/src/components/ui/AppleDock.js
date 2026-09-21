/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useRef } from "react";
import PropTypes from "prop-types";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { makeStyles } from "@material-ui/core/styles";
import cn from "../../lib/cn";

const DEFAULT_SIZE = 36;
const DEFAULT_MAGNIFICATION = 52;
const DEFAULT_DISTANCE = 120;

const useStyles = makeStyles((theme) => ({
  dock: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    margin: "0 auto 20px",
    padding: "6px 10px",
    minHeight: 54,
    width: "max-content",
    maxWidth: "100%",
    borderRadius: 18,
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)"
    }`,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    background:
      theme.palette.type === "dark"
        ? "rgba(15, 23, 42, 0.55)"
        : "rgba(255, 255, 255, 0.72)",
    boxShadow:
      theme.palette.type === "dark"
        ? "0 8px 32px rgba(0,0,0,0.35)"
        : "0 8px 28px rgba(15, 23, 42, 0.08)"
  },
  iconShell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    cursor: "pointer",
    flexShrink: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    transition: "background-color 0.15s ease"
  },
  iconInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%"
  }
}));

export function AppleDock({
  className,
  children,
  iconSize = DEFAULT_SIZE,
  iconMagnification = DEFAULT_MAGNIFICATION,
  disableMagnification = false,
  iconDistance = DEFAULT_DISTANCE,
  direction = "middle",
  ...props
}) {
  const classes = useStyles();
  const mouseX = useMotionValue(Infinity);

  const items = React.Children.map(children, (child) => {
    if (!React.isValidElement(child) || child.type !== AppleDockIcon) return child;
    return React.cloneElement(child, {
      mouseX,
      size: iconSize,
      magnification: iconMagnification,
      disableMagnification,
      distance: iconDistance
    });
  });

  return (
    <motion.div
      className={cn(classes.dock, className)}
      style={{
        alignItems:
          direction === "top" ? "flex-start" : direction === "bottom" ? "flex-end" : "center"
      }}
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      {...props}
    >
      {items}
    </motion.div>
  );
}

AppleDock.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
  iconSize: PropTypes.number,
  iconMagnification: PropTypes.number,
  disableMagnification: PropTypes.bool,
  iconDistance: PropTypes.number,
  direction: PropTypes.oneOf(["top", "middle", "bottom"])
};

export function AppleDockIcon({
  size = DEFAULT_SIZE,
  magnification = DEFAULT_MAGNIFICATION,
  disableMagnification = false,
  distance = DEFAULT_DISTANCE,
  mouseX,
  className,
  children,
  onClick,
  "aria-label": ariaLabel,
  ...props
}) {
  const classes = useStyles();
  const ref = useRef(null);
  const padding = Math.max(6, size * 0.2);
  const defaultMouseX = useMotionValue(Infinity);

  const distanceCalc = useTransform(mouseX || defaultMouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const targetSize = disableMagnification ? size : magnification;
  const sizeTransform = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [size, targetSize, size]
  );
  const scaleSize = useSpring(sizeTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12
  });

  return (
    <motion.button
      type="button"
      ref={ref}
      aria-label={ariaLabel}
      onClick={onClick}
      style={{ width: scaleSize, height: scaleSize, padding }}
      className={cn(classes.iconShell, className)}
      {...props}
    >
      <span className={classes.iconInner}>{children}</span>
    </motion.button>
  );
}

AppleDockIcon.propTypes = {
  size: PropTypes.number,
  magnification: PropTypes.number,
  disableMagnification: PropTypes.bool,
  distance: PropTypes.number,
  mouseX: PropTypes.object,
  className: PropTypes.string,
  children: PropTypes.node,
  onClick: PropTypes.func,
  "aria-label": PropTypes.string
};

export default AppleDock;

// src/components/ImageFallback.jsx
import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';

const placeholderCar = '/assets/placeholder-car.jpg'; // Reference from public folder

const ImageFallback = ({ src, alt, marque = '', modele = '', className = '' }) => {
  const [imgSrc, setImgSrc] = useState(src || placeholderCar);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    if (hasError) return;
    setHasError(true);
    setImgSrc(placeholderCar);
    setIsLoading(false);
    console.warn(`Failed to load image: ${src}. Using placeholder.`);
  }, [hasError, src]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!src) {
      setImgSrc(placeholderCar);
      setIsLoading(false);
      setHasError(false);
    } else {
      setImgSrc(src);
      setIsLoading(true);
      setHasError(false);
    }
  }, [src]);

  return (
    <div className={`image-container ${className}`}>
      {isLoading && (
        <div className="image-loading-placeholder">
          <div className="image-loading-spinner"></div>
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        className={`vehicle-image ${isLoading ? 'loading' : ''}`}
        loading="lazy"
      />
    </div>
  );
};

ImageFallback.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string.isRequired,
  marque: PropTypes.string,
  modele: PropTypes.string,
  className: PropTypes.string,
};

export default ImageFallback;
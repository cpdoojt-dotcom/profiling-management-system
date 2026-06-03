import React, { useState, useEffect } from 'react';
import './ImageWithLoader.css';

const ImageWithLoader = ({ src, alt, className, style, onClick, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div className={`image-wrapper ${className || ''}`} style={style}>
      {!isLoaded && !hasError && (
        <div className="image-skeleton" aria-hidden="true" />
      )}
      {hasError ? (
        <div className="image-error" aria-label="Failed to load image">
          <span>Image not available</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`image-content ${isLoaded ? 'loaded' : ''}`}
          onLoad={handleLoad}
          onError={handleError}
          onClick={onClick}
          {...props}
        />
      )}
    </div>
  );
};

export default ImageWithLoader;

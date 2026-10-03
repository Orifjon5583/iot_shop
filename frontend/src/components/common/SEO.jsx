import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SEO = ({
  title,
  description,
  keywords,
  image = '/logo.png',
  type = 'website',
  schemaData = null,
}) => {
  const location = useLocation();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentUrl = `${origin}${location.pathname}`;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{title ? `${title} | Elektronikachi` : 'Elektronikachi — Aqlli Qurilmalar va Elektronika Do\'koni'}</title>
      <meta name="description" content={description || "Elektronikachi — IoT, Arduino, ESP32, Raspberry Pi. Professional elektronika do'koni."} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={title || 'Elektronikachi'} />
      <meta property="og:description" content={description || "Elektronikachi — IoT, Arduino, ESP32, Raspberry Pi."} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={title || 'Elektronikachi'} />
      <meta name="twitter:description" content={description || "Elektronikachi — IoT, Arduino, ESP32, Raspberry Pi."} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data (JSON-LD) */}
      {schemaData && (
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;

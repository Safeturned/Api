'use client';

import { useEffect } from 'react';

interface MetaTagsProps {
    title: string;
    description: string;
    url: string;
    image?: string;
    type?: string;
}

export default function DynamicMetaTags({
    title,
    description,
    url,
    image,
    type = 'website',
}: MetaTagsProps) {
    useEffect(() => {
        document.title = title;

        const updateMetaTag = (property: string, content: string, useProperty = true) => {
            const attribute = useProperty ? 'property' : 'name';
            let element = document.querySelector(
                `meta[${attribute}="${property}"]`
            ) as HTMLMetaElement;

            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attribute, property);
                document.head.appendChild(element);
            }

            element.setAttribute('content', content);
        };

        updateMetaTag('og:title', title);
        updateMetaTag('og:description', description);
        updateMetaTag('og:url', url);
        updateMetaTag('og:type', type);

        if (image) {
            updateMetaTag('og:image', image);
            updateMetaTag('og:image:width', '1200');
            updateMetaTag('og:image:height', '630');
        }

        updateMetaTag('twitter:card', image ? 'summary_large_image' : 'summary', false);
        updateMetaTag('twitter:title', title, false);
        updateMetaTag('twitter:description', description, false);

        if (image) {
            updateMetaTag('twitter:image', image, false);
        }

        updateMetaTag('description', description, false);
    }, [title, description, url, image, type]);

    return null;
}

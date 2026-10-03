const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'active' },
      select: { id: true, updatedAt: true },
    });

    const readyProducts = await prisma.readyProduct.findMany({
      where: { status: 'active' },
      select: { id: true, updatedAt: true },
    });

    const categories = await prisma.category.findMany({
      select: { id: true, slug: true },
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static Pages
    const staticPages = ['/', '/products', '/ready-products', '/about', '/contact'];
    for (const page of staticPages) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page}</loc>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>1.0</priority>\n';
      xml += '  </url>\n';
    }

    // Categories
    for (const cat of categories) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/products?category=${cat.slug}</loc>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    // Products
    for (const product of products) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/products/${product.id}</loc>\n`;
      xml += `    <lastmod>${product.updatedAt.toISOString()}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    // Ready Products
    for (const rp of readyProducts) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/ready-products/${rp.id}</loc>\n`;
      xml += `    <lastmod>${rp.updatedAt.toISOString()}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    xml += '</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap Error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;

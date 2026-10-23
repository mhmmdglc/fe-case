import { lazy } from "react";
import { Button, Result } from "antd";
import { createBrowserRouter, Link, Navigate } from "react-router-dom";
import { productPages } from "@/features/products";
import { promotionPages } from "@/features/promotions";
import { routePatterns, routes } from "@/shared/routes";
import { AppLayout } from "./layout/AppLayout";

// Pages are separate chunks, loaded on first visit; AppLayout shows the fallback meanwhile.
const ProductListPage = lazy(productPages.list);
const ProductDetailPage = lazy(productPages.detail);
const PromotionsPage = lazy(promotionPages.list);
const PromotionDetailPage = lazy(promotionPages.detail);

function NotFoundPage() {
  return (
    <Result
      status="404"
      title="Page not found"
      extra={
        <Link to={routes.products()}>
          <Button type="primary">Go to products</Button>
        </Link>
      }
    />
  );
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to={routes.products()} replace /> },
      { path: routePatterns.products, element: <ProductListPage /> },
      { path: routePatterns.product, element: <ProductDetailPage /> },
      { path: routePatterns.promotions, element: <PromotionsPage /> },
      { path: routePatterns.promotion, element: <PromotionDetailPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

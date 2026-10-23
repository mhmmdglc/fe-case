import { useState } from "react";
import { App as AntApp, Button, ConfigProvider, Result } from "antd";
import { QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { createBrowserRouter, Link, Navigate, RouterProvider } from "react-router-dom";
import { makeQueryClient } from "./app/queryClient";
import { makeStore } from "./app/store";
import { AppLayout } from "./components/AppLayout";
import { ProductDetailPage } from "./features/products/ProductDetailPage";
import { ProductListPage } from "./features/products/ProductListPage";
import { PromotionsPage } from "./features/promotions/PromotionsPage";

function NotFoundPage() {
  return (
    <Result
      status="404"
      title="Page not found"
      extra={
        <Link to="/products">
          <Button type="primary">Go to products</Button>
        </Link>
      }
    />
  );
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/products" replace /> },
      { path: "products", element: <ProductListPage /> },
      { path: "products/:id", element: <ProductDetailPage /> },
      { path: "promotions", element: <PromotionsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  const [store] = useState(makeStore);
  const [queryClient] = useState(makeQueryClient);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={{ token: { colorPrimary: "#1f3a5f", borderRadius: 6 } }}>
          <AntApp>
            <RouterProvider router={router} />
          </AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </Provider>
  );
}

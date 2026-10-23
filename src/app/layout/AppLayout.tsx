import { Suspense } from "react";
import { Layout, Menu, Skeleton } from "antd";
import { Link, Outlet, useLocation } from "react-router-dom";
import { routes } from "@/shared/routes";
import styles from "./AppLayout.module.scss";

const NAV_ITEMS = [
  { key: routes.products(), label: <Link to={routes.products()}>Products</Link> },
  { key: routes.promotions(), label: <Link to={routes.promotions()}>Promotions</Link> },
];

export function AppLayout() {
  const { pathname } = useLocation();
  const selected = NAV_ITEMS.find((item) => pathname.startsWith(item.key))?.key;

  return (
    <Layout>
      <Layout.Header className={styles.header}>
        <div className={styles.brand}>
          ModaCo<span>Merchandising</span>
        </div>
        <Menu
          className={styles.menu}
          theme="dark"
          mode="horizontal"
          items={NAV_ITEMS}
          selectedKeys={selected ? [selected] : []}
        />
      </Layout.Header>
      <Layout.Content className={styles.content}>
        {/* Pages are lazy-loaded (app/router.tsx); the same skeleton the pages show while loading. */}
        <Suspense fallback={<Skeleton active paragraph={{ rows: 8 }} />}>
          <Outlet />
        </Suspense>
      </Layout.Content>
    </Layout>
  );
}

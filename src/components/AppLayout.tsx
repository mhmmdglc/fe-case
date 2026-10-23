import { Layout, Menu } from "antd";
import { Link, Outlet, useLocation } from "react-router-dom";
import styles from "./AppLayout.module.scss";

const NAV_ITEMS = [
  { key: "/products", label: <Link to="/products">Products</Link> },
  { key: "/promotions", label: <Link to="/promotions">Promotions</Link> },
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
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}

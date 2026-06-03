import { Chip } from "@mui/material";

interface Props {
  label: string,
  menuItems: { url: string, label: string }[]
	onNavigate: (url: string) => void;
  /** When set, highlights the matching menu item by URL (e.g. Roles on /settings/role/...). */
  activeUrl?: string;
}

export const SecondaryMenu = (props:Props) => {
  const isActive = (item: { url: string; label: string }) => {
    if (props.activeUrl) return item.url === props.activeUrl;
    return item.label === props.label;
  };

  const getItems = () => {
    const result:any[] = [];
    props.menuItems.forEach((item) => {
      if (isActive(item)) result.push(<Chip key={item.url} onClick={() => props.onNavigate(item.url)} label={item.label} component="a" variant="filled" clickable style={{ backgroundColor: "var(--c1d2)", color: "#FFF", fontSize: 16 }} />);
      else result.push(<a key={item.url} href="about:blank" onClick={(e) => { e.preventDefault(); props.onNavigate(item.url); }} style={{ color: "#FFF", textDecoration: "none", marginLeft: 10, marginRight: 10 }}>{item.label}</a>);
    });
    return result;
  };

  return (<div id="secondaryMenu">
    {getItems()}
  </div>);
};

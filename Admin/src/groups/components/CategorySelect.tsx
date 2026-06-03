import React from "react";
import { ApiHelper, Locale } from "@machonharuach/apphelper";
import { type GroupInterface } from "@machonharuach/helpers";
import { ComboBox } from "../../components";

interface Props {
  value: string;
  onChange: (value: string) => void;
  label: string;
  tags?: string;
  testId?: string;
  placeholder?: string;
  includeOptions?: string[];
}

export const CategorySelect: React.FC<Props> = (props) => {
  const [categories, setCategories] = React.useState<string[]>([]);

  const loadCategories = () => {
    const tags = props.tags || "standard";
    const endpoint = tags === "standard" ? "/groups" : "/groups/tag/" + tags;
    ApiHelper.get(endpoint, "MembershipApi").then((data: GroupInterface[]) => {
      const optionSeed = [...(props.includeOptions || []), ...data.map((g) => g.categoryName || "")];
      const uniqueCategories = Array.from(new Set(optionSeed.map((c) => c.trim()).filter((c) => c)));
      setCategories(uniqueCategories);
    });
  };

  React.useEffect(() => {
    loadCategories();
  }, [props.tags, props.includeOptions]);

  return (
    <ComboBox
      value={props.value}
      onChange={props.onChange}
      label={props.label}
      options={categories}
      testId={props.testId}
      placeholder={props.placeholder || Locale.label("placeholders.group.category")}
    />
  );
};

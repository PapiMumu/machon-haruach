import React, { memo, useCallback } from "react";
import { ApiHelper, InputBox, DateHelper, UniqueIdHelper, Locale } from "@machonharuach/apphelper";
import { type DonationBatchInterface } from "@machonharuach/helpers";
import { TextField } from "@mui/material";

interface Props {
  batchId: string;
  updatedFunction: () => void;
}

export const BatchEdit = memo((props: Props) => {
  const [batch, setBatch] = React.useState<DonationBatchInterface & { branchName?: string | null }>({
    batchDate: DateHelper.formatHtml5Date(new Date()),
    name: "",
    branchName: ""
  });

  const handleCancel = useCallback(() => {
    props.updatedFunction();
  }, [props.updatedFunction]);

  const handleSave = useCallback(() => {
    const batchToSave = {
      ...batch,
      batchDate: batch.batchDate ? DateHelper.formatHtml5Date(batch.batchDate) : null,
      branchName: (batch.branchName ?? "").toString().trim() || null
    };

    if (batch.id) batchToSave.id = batch.id;
    return ApiHelper.post("/donationbatches", [batchToSave], "GivingApi").then(() => props.updatedFunction());
  }, [batch, props.updatedFunction]);

  const handleDelete = useCallback(() => {
    if (window.confirm(Locale.label("donations.batchEdit.confirmMsg"))) {
      ApiHelper.delete("/donationbatches/" + batch.id, "GivingApi").then(() => props.updatedFunction());
    }
  }, [batch.id, props.updatedFunction]);

  const getDeleteFunction = useCallback(() => (!UniqueIdHelper.isMissing(props.batchId) ? handleDelete : undefined), [props.batchId, handleDelete]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<any>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const b: DonationBatchInterface & { branchName?: string | null } = { ...batch };
      switch (e.currentTarget.name) {
        case "name": b.name = e.currentTarget.value; break;
        case "branchName": b.branchName = e.currentTarget.value; break;
        case "date": b.batchDate = e.currentTarget.value || null; break;
      }
      setBatch(b);
    },
    [batch]
  );

  const loadData = useCallback(() => {
    if (UniqueIdHelper.isMissing(props.batchId))
      setBatch({ batchDate: DateHelper.formatHtml5Date(new Date()), name: "", branchName: "" });
    else {
      ApiHelper.get("/donationbatches/" + props.batchId, "GivingApi").then((data) => {
        // batchDate is now a YYYY-MM-DD string - normalize with formatHtml5Date
        if (data.batchDate) data.batchDate = DateHelper.formatHtml5Date(data.batchDate);
        if (data.branchName == null) data.branchName = "";
        setBatch(data);
      });
    }
  }, [props.batchId]);

  React.useEffect(loadData, [loadData]);

  return (
    <InputBox
      id="batchBox"
      headerIcon="volunteer_activism"
      headerText={Locale.label("common.edit")}
      cancelFunction={handleCancel}
      deleteFunction={getDeleteFunction()}
      saveFunction={handleSave}
      help="docs/b1-admin/donations/recording-donations">
      <TextField fullWidth name="name" data-cy="batch-name" label={Locale.label("donations.batchEdit.opName")} value={batch.name} onChange={handleChange} onKeyDown={handleKeyDown} placeholder={Locale.label("placeholders.batch.name")} />
      <TextField
        fullWidth
        name="branchName"
        data-cy="batch-branch"
        label="Branch / campus"
        value={batch.branchName ?? ""}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Optional — group online gifts with mobile campus selection"
        sx={{ mt: 2 }}
      />
      <TextField
        fullWidth
        type="date"
        data-cy="batch-date"
        name="date"
        InputLabelProps={{ shrink: true }}
        label={Locale.label("donations.batchEdit.date")}
        value={DateHelper.formatHtml5Date(batch.batchDate)}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    </InputBox>
  );
});

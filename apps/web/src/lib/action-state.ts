export type ActionState = {
  actionId: number;
  message: string;
  status: "idle" | "success" | "error";
};

export const initialActionState: ActionState = {
  actionId: 0,
  message: "",
  status: "idle",
};

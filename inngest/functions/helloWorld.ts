import { inngest } from "@/lib/inngest";

export const helloWorld = inngest.createFunction(
  { id: "hello-world", name: "Hello World" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");

    return {
      message: `Hello, ${event.data.name ?? "World"}! This is your first Inngest function 🎉`,
    };
  },
);

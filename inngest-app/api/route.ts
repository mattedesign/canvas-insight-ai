import { Inngest } from "inngest";
import { serve } from "inngest/next";

const inngest = new Inngest({ id: "figmant-ai" });

const jobCreated = inngest.createFunction(
  { id: "job-created" },
  { event: "analysis/job.created" },
  async ({ event, step }) => {
    await step.run("log", () => {
      console.log("job.created", event.data);
      return { received: true, jobId: event.data.id };
    });
  }
);

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [jobCreated]
});

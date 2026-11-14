import { requestForm } from "@/lib/request-form";
import { greenMutation } from "@/lib/green-mutations";
import { InputError } from "@/lib/mutations";
import { demoRole } from "@/lib/role";
export async function POST(request: Request) {
  try {
    const result = await greenMutation(
      await requestForm(request),
      await demoRole(),
    );
    return Response.json(result);
  } catch (e) {
    if (e instanceof InputError)
      return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json(
      {
        error:
          "Не удалось сохранить изменения. Обновите страницу и повторите попытку.",
      },
      { status: 500 },
    );
  }
}

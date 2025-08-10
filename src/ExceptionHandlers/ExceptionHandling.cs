namespace Safeturned.Api.ExceptionHandlers;

internal static class ExceptionHandling
{
    public static void OnUnhandledException(object sender, UnhandledExceptionEventArgs args)
    {
        if (args.ExceptionObject is not Exception exception)
        {
            return;
        }

        SentrySdk.CaptureException(exception, x => x.SetExtra("message", "Unhandled exception occured!"));
    }
}
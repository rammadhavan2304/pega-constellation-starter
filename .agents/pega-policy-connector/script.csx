// Power Platform custom connector Code tab.
// This exposes simple Copilot inputs, then calls the same Pega DX agent
// conversation endpoints used by the starter React portal.

public class Script : ScriptBase
{
    private const string AgentId = "IH-INSURE-WORK-POLICYCLARIFICATION!POLICYQUESTION";

    public override async Task<HttpResponseMessage> ExecuteAsync()
    {
        if (this.Context.OperationId != "invokePolicyQuestion")
        {
            return await this.Context.SendAsync(this.Context.Request, this.CancellationToken).ConfigureAwait(false);
        }

        var originalRequest = this.Context.Request;
        var inputText = await originalRequest.Content.ReadAsStringAsync().ConfigureAwait(false);
        var input = string.IsNullOrWhiteSpace(inputText)
            ? new Newtonsoft.Json.Linq.JObject()
            : Newtonsoft.Json.Linq.JObject.Parse(inputText);

        var question = ReadString(input, "question");
        var customerId = ReadString(input, "customerId");
        var policyId = ReadString(input, "policyId");
        var documentId = ReadString(input, "documentId");
        var documentUrl = ReadString(input, "documentUrl");
        var prompt = BuildPrompt(question, customerId, policyId, documentId, documentUrl);

        var conversationUri = originalRequest.RequestUri;
        var interactionId = "copilot-" + System.Guid.NewGuid().ToString("N");

        originalRequest.Method = HttpMethod.Post;
        originalRequest.Content = CreateJsonContent(new Newtonsoft.Json.Linq.JObject
        {
            ["executeStarterQuestion"] = false,
            ["interactionID"] = interactionId
        }.ToString(Newtonsoft.Json.Formatting.None));

        var startResponse = await this.Context.SendAsync(originalRequest, this.CancellationToken).ConfigureAwait(false);
        var startText = await startResponse.Content.ReadAsStringAsync().ConfigureAwait(false);

        if (!startResponse.IsSuccessStatusCode)
        {
            startResponse.Content = CreateJsonContent(startText);
            return startResponse;
        }

        var conversationId = ExtractConversationId(startText);
        if (string.IsNullOrWhiteSpace(conversationId))
        {
            var failed = new HttpResponseMessage(System.Net.HttpStatusCode.BadGateway);
            failed.Content = CreateJsonContent(new Newtonsoft.Json.Linq.JObject
            {
                ["output"] = "Pega started the agent request but did not return a conversation ID.",
                ["raw"] = startText
            }.ToString(Newtonsoft.Json.Formatting.None));
            return failed;
        }

        var messageUri = new System.Uri(
            conversationUri.ToString().TrimEnd('/') + "/" + System.Uri.EscapeDataString(conversationId));

        var messageRequest = new HttpRequestMessage(new HttpMethod("PATCH"), messageUri);
        CopyRequestHeaders(originalRequest, messageRequest);
        messageRequest.Headers.Accept.Clear();
        messageRequest.Headers.TryAddWithoutValidation("Accept", "application/json");
        messageRequest.Content = CreateJsonContent(new Newtonsoft.Json.Linq.JObject
        {
            ["Request"] = prompt
        }.ToString(Newtonsoft.Json.Formatting.None));

        var messageResponse = await this.Context.SendAsync(messageRequest, this.CancellationToken).ConfigureAwait(false);
        var messageText = await messageResponse.Content.ReadAsStringAsync().ConfigureAwait(false);

        if (!messageResponse.IsSuccessStatusCode || string.IsNullOrWhiteSpace(messageText))
        {
            messageResponse.Content = CreateJsonContent(messageText);
            return messageResponse;
        }

        var raw = Newtonsoft.Json.Linq.JObject.Parse(messageText);
        var wrapper = new Newtonsoft.Json.Linq.JObject
        {
            ["output"] = ExtractAgentText(raw),
            ["raw"] = raw
        };

        messageResponse.Content = CreateJsonContent(wrapper.ToString(Newtonsoft.Json.Formatting.None));
        return messageResponse;
    }

    private static void CopyRequestHeaders(HttpRequestMessage source, HttpRequestMessage target)
    {
        foreach (var header in source.Headers)
        {
            target.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }
    }

    private static string BuildPrompt(
        string question,
        string customerId,
        string policyId,
        string documentId,
        string documentUrl)
    {
        var lines = new System.Collections.Generic.List<string>
        {
            question,
            "",
            "Use the following tool parameters for this policy question:",
            $"CustomerID: {customerId}",
            $"PolicyID: {policyId}"
        };

        if (!string.IsNullOrWhiteSpace(documentId))
        {
            lines.Add($"DocumentID: {documentId}");
        }

        lines.Add($"DocumentURL: {documentUrl}");
        lines.Add($"Document: {documentUrl}");
        lines.Add($"ChatQuestionPrompt: {question}");

        return string.Join("\n", lines);
    }

    private static string ExtractConversationId(string responseText)
    {
        if (string.IsNullOrWhiteSpace(responseText))
        {
            return string.Empty;
        }

        var data = Newtonsoft.Json.Linq.JObject.Parse(responseText);
        return data["ID"]?.ToString()
            ?? data["conversationID"]?.ToString()
            ?? data["conversationId"]?.ToString()
            ?? data["data"]?["ID"]?.ToString()
            ?? data["data"]?["conversationID"]?.ToString()
            ?? data["data"]?["conversationId"]?.ToString()
            ?? string.Empty;
    }

    private static string ReadString(Newtonsoft.Json.Linq.JObject input, string name)
    {
        return input[name]?.ToString() ?? string.Empty;
    }

    private static string ExtractAgentText(Newtonsoft.Json.Linq.JObject raw)
    {
        var response = raw["response"]?.ToString();
        if (!string.IsNullOrWhiteSpace(response))
        {
            return response;
        }

        var output = raw["output"]?.ToString();
        if (!string.IsNullOrWhiteSpace(output))
        {
            return output;
        }

        var messages = raw["messages"] as Newtonsoft.Json.Linq.JArray;
        if (messages != null)
        {
            for (var i = messages.Count - 1; i >= 0; i--)
            {
                var text = messages[i]?["content"]?.ToString()
                    ?? messages[i]?["text"]?.ToString()
                    ?? messages[i]?["message"]?.ToString();
                if (!string.IsNullOrWhiteSpace(text))
                {
                    return text;
                }
            }
        }

        return raw.ToString(Newtonsoft.Json.Formatting.None);
    }
}

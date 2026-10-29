from tools.legal_tools import get_legal_context_tool


def test_document_type_cannot_be_used_for_path_traversal():
    result = get_legal_context_tool("../../agent")
    assert "No reviewed notes available" in result


def test_placeholder_knowledge_is_not_presented_as_reviewed():
    result = get_legal_context_tool("eviction_or_rent")
    assert "No reviewed notes available" in result

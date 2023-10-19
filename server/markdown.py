# Base on https://gist.github.com/mikefromit/5a6fdfecc9310712f15a872df9f41f03

from jinja2 import pass_environment, nodes
from jinja2.ext import Extension
import markdown as md


@pass_environment
def markdown(env, value):
    """
    Markdown filter with support for extensions.
    """
    output = value
    # insert custom markdown extensions here
    extensions = [
        "markdown.extensions.meta",
        "markdown.extensions.attr_list",
        "markdown.extensions.toc",
        "markdown.extensions.def_list"
    ]

    d = dict()
    d["extensions"] = list()
    d["extensions"].extend(extensions)

    marked = md.Markdown(**d)

    return marked.convert(output)


class Markdown(Extension):
    """
    A wrapper around the markdown filter for syntactic sugar.
    """
    tags = set(["markdown"])

    def parse(self, parser):
        """
        Parses the statements and defers to the callback
        for markdown processing.
        """
        lineno = next(parser.stream).lineno
        body = parser.parse_statements(["name:endmarkdown"], drop_needle=True)

        return nodes.CallBlock(
            self.call_method("_render_markdown"), [], [], body
        ).set_lineno(lineno)

    def _render_markdown(self, caller=None):
        """
        Calls the markdown filter to transform the output.
        """
        if not caller:
            return ""
        output = caller().strip()
        return markdown(self.environment, output)

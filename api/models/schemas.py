from pydantic import BaseModel, Field


class InitSearchRequest(BaseModel):
    webpages: list[str] = Field(min_length=1)
    selector: str | None = None


class ExpandSearchRequest(BaseModel):
    dataset_id: str
    description: str = Field(
        default="",
        max_length=2000
    )
    sample_size: int = Field(
        default=10,
        ge=1,
        le=100
    )


class SearchRequest(BaseModel):
    dataset_id: str
    attributes: list[str] = Field(min_length=1)


class DiscoveredAttributes(BaseModel):
    attributes: list[str]


class ExtractedAttribute(BaseModel):
    attribute: str
    value: str | None = None
    summary: str = ""
    source_url: str | None = None


class AttributeExtraction(BaseModel):
    results: list[ExtractedAttribute]
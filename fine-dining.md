---
layout: default
title: Fine Dining Reviews
---

## Fine Dining Reviews

{% assign sorted_reviews = site.reviews | sort: "date" | reverse %}
{% for review in sorted_reviews %}
- [{{ review.title }}]({{ review.url | relative_url }}) — {{ review.restaurant }}, {{ review.location }}
{% endfor %}

{% if site.reviews.size == 0 %}
*Reviews coming soon.*
{% endif %}

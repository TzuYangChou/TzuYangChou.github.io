---
layout: review
title: Fine Dining Reviews
---

## Fine Dining Reviews

{% assign sorted_reviews = site.reviews | sort: "date" | reverse %}
{% for review in sorted_reviews %}
- {{ review.date | date: "%Y-%m-%d" }} — [{{ review.restaurant }}]({{ review.url | relative_url }}), {{ review.location }}
{% endfor %}

{% if site.reviews.size == 0 %}
*Reviews coming soon.*
{% endif %}

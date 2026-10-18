import type { LessonNode, Course } from './course';
import { site } from '../config';

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    alternateName: site.latinName,
    url: site.url,
    description: site.description,
    inLanguage: 'zh-CN',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${site.url}/learn?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function lessonJsonLd(node: LessonNode, course: Course) {
  const part = course.parts.find((p) => p.def.id === node.part);
  return {
    '@context': 'https://schema.org',
    '@type': ['Article', 'LearningResource'],
    headline: node.title,
    name: node.title,
    description: node.thesis,
    url: `${site.url}/learn/${node.slug}`,
    inLanguage: 'zh-CN',
    author: { '@type': 'Organization', name: site.name },
    publisher: { '@type': 'Organization', name: site.name, url: site.url },
    learningResourceType: '课程',
    educationalLevel: '入门到进阶',
    timeRequired: `PT${node.minutes}M`,
    isAccessibleForFree: true,
    isPartOf: {
      '@type': 'Course',
      name: `${site.name}｜量子计算，从一块偏振片开始`,
      description: part?.def.desc,
      url: `${site.url}/learn`,
    },
  };
}

export function courseJsonLd(course: Course) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${site.name}｜量子计算，从一块偏振片开始`,
    description: site.description,
    url: `${site.url}/learn`,
    inLanguage: 'zh-CN',
    isAccessibleForFree: true,
    educationalLevel: '入门到进阶',
    provider: { '@type': 'Organization', name: site.name, url: site.url },
    hasCourseInstance: course.parts.map((p) => ({
      '@type': 'CourseInstance',
      name: `${p.def.num} ${p.def.title}`,
      description: p.def.desc,
      courseWorkload: `PT${p.minutes}M`,
    })),
  };
}

export function breadcrumbJsonLd(trail: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: `${site.url}${t.url}`,
    })),
  };
}

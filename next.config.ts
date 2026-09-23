import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/*': ['./prisma/dev.db', './prisma/schema.prisma'],
    '/**/*': ['./prisma/dev.db', './prisma/schema.prisma'],
    'app/**/*': ['./prisma/dev.db', './prisma/schema.prisma'],
    'a/**/*': ['./prisma/dev.db', './prisma/schema.prisma'],
  },
};

export default nextConfig;

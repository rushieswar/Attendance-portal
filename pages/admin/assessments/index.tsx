/**
 * Admin - View All Assessments
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Button from '../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../components/bootstrap/Card';
import Input from '../../../components/bootstrap/forms/Input';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole, Assessment } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import showNotification from '../../../components/extras/showNotification';

interface AssessmentWithYear extends Assessment {
	academic_year: {
		name: string;
		is_current: boolean;
	};
}

const AssessmentsPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [assessments, setAssessments] = useState<AssessmentWithYear[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch assessments
	useEffect(() => {
		const fetchAssessments = async () => {
			if (!user) return;
			try {
				const { data, error } = await supabase
					.from('assessments')
					.select(`
						*,
						academic_year:academic_years(name, is_current)
					`)
					.order('assessment_date', { ascending: false });

				if (error) throw error;
				setAssessments(data || []);
			} catch (error) {
				console.error('Error fetching assessments:', error);
				showNotification('Error', 'Failed to load assessments', 'danger');
			} finally {
				setLoadingData(false);
			}
		};
		fetchAssessments();
	}, [user]);

	// Filter assessments by search term
	const filteredAssessments = assessments.filter((assessment) =>
		assessment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		assessment.description?.toLowerCase().includes(searchTerm.toLowerCase())
	);

	if (loading || !user || role !== UserRole.SUPER_ADMIN) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Assessments - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>All Assessments</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='Assignment'>
									<CardTitle>Assessments</CardTitle>
								</CardLabel>
								<div className='col-md-4'>
									<Input
										type='search'
										placeholder='Search assessments...'
										value={searchTerm}
										onChange={(e: any) => setSearchTerm(e.target.value)}
									/>
								</div>
							</CardHeader>
							<CardBody className='table-responsive'>
								{loadingData ? (
									<div className='text-center py-5'>Loading...</div>
								) : filteredAssessments.length === 0 ? (
									<div className='text-center py-5 text-muted'>
										{searchTerm ? 'No assessments found matching your search' : 'No assessments found'}
									</div>
								) : (
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Name</th>
												<th>Description</th>
												<th>Academic Year</th>
												<th>Assessment Date</th>
												<th>Max Marks</th>
											</tr>
										</thead>
										<tbody>
											{filteredAssessments.map((assessment) => (
												<tr key={assessment.id}>
													<td className='fw-bold'>{assessment.name}</td>
													<td>
														<div style={{ maxWidth: '300px' }} className='text-truncate'>
															{assessment.description || '-'}
														</div>
													</td>
													<td>
														{assessment.academic_year.name}
														{assessment.academic_year.is_current && (
															<span className='badge bg-primary ms-2'>Current</span>
														)}
													</td>
													<td>
														{assessment.assessment_date
															? new Date(assessment.assessment_date).toLocaleDateString()
															: '-'}
													</td>
													<td>{assessment.max_marks}</td>
												</tr>
											))}
										</tbody>
									</table>
								)}
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>
		</PageWrapper>
	);
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: {
		// @ts-ignore
		...(await serverSideTranslations(locale, ['common', 'menu'])),
	},
});

export default AssessmentsPage;


/**
 * Admin - Grades Management
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
import Select from '../../../components/bootstrap/forms/Select';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import showNotification from '../../../components/extras/showNotification';

interface Grade {
	id: string;
	marks_obtained: number;
	student: {
		full_name: string;
		admission_number: string;
		class: {
			name: string;
		};
	};
	assessment: {
		name: string;
		max_marks: number;
		assessment_date: string;
	};
	subject: {
		name: string;
		code: string;
	};
}

interface Class {
	id: string;
	name: string;
	grade_level: string;
}

interface Assessment {
	id: string;
	name: string;
}

const AdminGradesPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [grades, setGrades] = useState<Grade[]>([]);
	const [classes, setClasses] = useState<Class[]>([]);
	const [assessments, setAssessments] = useState<Assessment[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [classFilter, setClassFilter] = useState('all');
	const [assessmentFilter, setAssessmentFilter] = useState('all');

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch classes
	useEffect(() => {
		const fetchClasses = async () => {
			try {
				const { data, error } = await supabase
					.from('classes')
					.select('id, name, grade_level')
					.order('name');

				if (error) throw error;
				setClasses(data || []);
			} catch (error) {
				console.error('Error fetching classes:', error);
			}
		};
		if (user) fetchClasses();
	}, [user]);

	// Fetch assessments
	useEffect(() => {
		const fetchAssessments = async () => {
			try {
				const { data, error } = await supabase
					.from('assessments')
					.select('id, name')
					.order('name');

				if (error) throw error;
				setAssessments(data || []);
			} catch (error) {
				console.error('Error fetching assessments:', error);
			}
		};
		if (user) fetchAssessments();
	}, [user]);

	// Fetch grades
	const fetchGrades = async () => {
		try {
			const { data, error } = await supabase
				.from('grades')
				.select(`
					id,
					marks_obtained,
					student:students(
						full_name,
						admission_number,
						class:classes(name)
					),
					assessment:assessments(name, max_marks, assessment_date),
					subject:subjects(name, code)
				`)
				.order('created_at', { ascending: false });

			if (error) throw error;
			setGrades(data || []);
		} catch (error) {
			console.error('Error fetching grades:', error);
			showNotification('Error', 'Failed to load grades', 'danger');
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		if (user) fetchGrades();
	}, [user]);

	// Filter grades
	const filteredGrades = grades.filter((grade) => {
		const matchesSearch =
			grade.student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			grade.student.admission_number.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesClass =
			classFilter === 'all' || grade.student.class?.name === classFilter;
		const matchesAssessment =
			assessmentFilter === 'all' || grade.assessment.name === assessmentFilter;
		return matchesSearch && matchesClass && matchesAssessment;
	});

	if (loading || !user || role !== UserRole.SUPER_ADMIN) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Grades Management - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Grades Management</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='Grade'>
									<CardTitle>All Grades ({filteredGrades.length})</CardTitle>
								</CardLabel>
								<div className='d-flex gap-3'>
									<div className='col-md-3'>
										<Input
											type='search'
											placeholder='Search by student name or admission no...'
											value={searchTerm}
											onChange={(e: any) => setSearchTerm(e.target.value)}
										/>
									</div>
									<div className='col-md-2'>
										<Select
											value={classFilter}
											onChange={(e: any) => setClassFilter(e.target.value)}
											ariaLabel='Filter by class'>
											<option value='all'>All Classes</option>
											{classes.map((cls) => (
												<option key={cls.id} value={cls.name}>
													{cls.name}
												</option>
											))}
										</Select>
									</div>
									<div className='col-md-2'>
										<Select
											value={assessmentFilter}
											onChange={(e: any) => setAssessmentFilter(e.target.value)}
											ariaLabel='Filter by assessment'>
											<option value='all'>All Assessments</option>
											{assessments.map((assessment) => (
												<option key={assessment.id} value={assessment.name}>
													{assessment.name}
												</option>
											))}
										</Select>
									</div>
								</div>
							</CardHeader>
							<CardBody className='table-responsive'>
								{loadingData ? (
									<div className='text-center py-5'>Loading...</div>
								) : filteredGrades.length === 0 ? (
									<div className='text-center py-5 text-muted'>
										{searchTerm || classFilter !== 'all' || assessmentFilter !== 'all'
											? 'No grades found matching your filters'
											: 'No grades found'}
									</div>
								) : (
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Student</th>
												<th>Class</th>
												<th>Assessment</th>
												<th>Subject</th>
												<th>Marks</th>
												<th>Percentage</th>
												<th>Date</th>
											</tr>
										</thead>
										<tbody>
											{filteredGrades.map((grade) => {
												const percentage = (
													(grade.marks_obtained / grade.assessment.max_marks) *
													100
												).toFixed(1);
												return (
													<tr key={grade.id}>
														<td>
															<div className='fw-bold'>{grade.student.full_name}</div>
															<small className='text-muted'>{grade.student.admission_number}</small>
														</td>
														<td>{grade.student.class?.name || 'N/A'}</td>
														<td>{grade.assessment.name}</td>
														<td>
															{grade.subject.name}
															<br />
															<small className='text-muted'>{grade.subject.code}</small>
														</td>
														<td>
															{grade.marks_obtained} / {grade.assessment.max_marks}
														</td>
														<td>
															<span
																className={`badge ${
																	parseFloat(percentage) >= 75
																		? 'bg-success'
																		: parseFloat(percentage) >= 50
																		? 'bg-warning'
																		: 'bg-danger'
																}`}>
																{percentage}%
															</span>
														</td>
														<td>
															{grade.assessment.assessment_date
																? new Date(grade.assessment.assessment_date).toLocaleDateString()
																: '-'}
														</td>
													</tr>
												);
											})}
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

export default AdminGradesPage;


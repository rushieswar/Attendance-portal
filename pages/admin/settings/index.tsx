/**
 * Admin - School Settings
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useFormik } from 'formik';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Button from '../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../components/bootstrap/Card';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import Select from '../../../components/bootstrap/forms/Select';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import showNotification from '../../../components/extras/showNotification';

interface SchoolSettings {
	id: string;
	school_name: string;
	address: string | null;
	contact_email: string | null;
	contact_phone: string | null;
	attendance_mode: 'daily' | 'period_wise';
	logo_url: string | null;
}

const AdminSettingsPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [settings, setSettings] = useState<SchoolSettings | null>(null);
	const [loadingData, setLoadingData] = useState(true);
	const [saving, setSaving] = useState(false);

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch school settings
	useEffect(() => {
		const fetchSettings = async () => {
			try {
				const { data, error } = await supabase
					.from('school_settings')
					.select('*')
					.single();

				if (error) throw error;
				setSettings(data);
				if (data) {
					formik.setValues({
						school_name: data.school_name || '',
						address: data.address || '',
						contact_email: data.contact_email || '',
						contact_phone: data.contact_phone || '',
						attendance_mode: data.attendance_mode || 'daily',
						logo_url: data.logo_url || '',
					});
				}
			} catch (error) {
				console.error('Error fetching settings:', error);
				showNotification('Error', 'Failed to load school settings', 'danger');
			} finally {
				setLoadingData(false);
			}
		};
		if (user) fetchSettings();
	}, [user]);

	const formik = useFormik({
		initialValues: {
			school_name: '',
			address: '',
			contact_email: '',
			contact_phone: '',
			attendance_mode: 'daily' as 'daily' | 'period_wise',
			logo_url: '',
		},
		onSubmit: async (values) => {
			setSaving(true);
			try {
				if (settings) {
					const { error } = await supabase
						.from('school_settings')
						.update(values)
						.eq('id', settings.id);
					if (error) throw error;
				} else {
					const { error } = await supabase.from('school_settings').insert([values]);
					if (error) throw error;
				}
				showNotification('Success', 'School settings updated successfully', 'success');
			} catch (error: any) {
				showNotification('Error', error.message, 'danger');
			} finally {
				setSaving(false);
			}
		},
	});

	if (loading || !user || role !== UserRole.SUPER_ADMIN) return null;

	return (
		<PageWrapper>
			<Head>
				<title>School Settings - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>School Settings</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-lg-8 offset-lg-2'>
						<Card>
							<CardHeader>
								<CardLabel icon='Settings'>
									<CardTitle>General Settings</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								{loadingData ? (
									<div className='text-center py-5'>Loading...</div>
								) : (
									<form onSubmit={formik.handleSubmit}>
										<div className='row g-4'>
											<div className='col-12'>
												<FormGroup id='school_name' label='School Name'>
													<Input
														onChange={formik.handleChange}
														value={formik.values.school_name}
														placeholder='Enter school name'
														required
													/>
												</FormGroup>
											</div>
											<div className='col-12'>
												<FormGroup id='address' label='Address'>
													<Textarea
														onChange={formik.handleChange}
														value={formik.values.address}
														placeholder='Enter school address'
														rows={3}
													/>
												</FormGroup>
											</div>
											<div className='col-md-6'>
												<FormGroup id='contact_email' label='Contact Email'>
													<Input
														type='email'
														onChange={formik.handleChange}
														value={formik.values.contact_email}
														placeholder='school@example.com'
													/>
												</FormGroup>
											</div>
											<div className='col-md-6'>
												<FormGroup id='contact_phone' label='Contact Phone'>
													<Input
														type='tel'
														onChange={formik.handleChange}
														value={formik.values.contact_phone}
														placeholder='+1234567890'
													/>
												</FormGroup>
											</div>
											<div className='col-md-6'>
												<FormGroup id='attendance_mode' label='Attendance Mode'>
													<Select
														onChange={formik.handleChange}
														value={formik.values.attendance_mode}
														ariaLabel='Attendance Mode'>
														<option value='daily'>Daily</option>
														<option value='period_wise'>Period-wise</option>
													</Select>
												</FormGroup>
											</div>
											<div className='col-md-6'>
												<FormGroup id='logo_url' label='Logo URL'>
													<Input
														type='url'
														onChange={formik.handleChange}
														value={formik.values.logo_url}
														placeholder='https://example.com/logo.png'
													/>
												</FormGroup>
											</div>
											<div className='col-12'>
												<div className='alert alert-info'>
													<strong>Note:</strong> Changes to attendance mode will affect how attendance is recorded throughout the system.
												</div>
											</div>
											<div className='col-12'>
												<div className='d-flex justify-content-end gap-3'>
													<Button
														color='secondary'
														onClick={() => router.push('/admin/dashboard')}>
														Cancel
													</Button>
													<Button
														color='primary'
														type='submit'
														isDisable={saving}>
														{saving ? 'Saving...' : 'Save Settings'}
													</Button>
												</div>
											</div>
										</div>
									</form>
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

export default AdminSettingsPage;

